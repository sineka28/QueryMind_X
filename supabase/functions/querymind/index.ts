import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// ============================================================
// QueryMind Edge Function — Multi-Agent Architecture
// Routes: /chat, /schema, /explain-schema, /stats, /dashboard
// Agents: Planner, SQL Generator, Security, Repair, Viz, Insight, Report, Follow-up
// AI: OpenAI when OPENAI_API_KEY secret is set, else heuristic engine.
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FORBIDDEN = [
  "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "CREATE",
  "GRANT", "REVOKE", "MERGE", "COPY", "VACUUM", "EXECUTE", "CALL",
  "REFRESH", "REINDEX", "CLUSTER", "ANALYZE",
];

// ---- Types (mirrors frontend types.ts) ----
interface ColumnInfo { column_name: string; data_type: string; }
interface ForeignKeyInfo { column_name: string; references_table: string; references_column: string; }
interface TableInfo { table_name: string; columns: ColumnInfo[]; primary_keys?: string[]; foreign_keys?: ForeignKeyInfo[]; }
interface SchemaInfo { tables: TableInfo[]; }

interface ChatBody {
  question: string;
  history?: { role: string; content: string }[];
}

interface AgentStep { agent: string; label: string; status: "pending" | "active" | "done" | "skipped"; detail?: string; }
interface ConfidenceBreakdown { schemaMatch: number; columnMatch: number; joinConfidence: number; aggregationConfidence: number; overall: number; reasoning: string[]; }
interface SqlClauseExplanation { clause: string; keyword: string; explanation: string; }
interface SqlTeacher { purpose: string; clauses: SqlClauseExplanation[]; concepts: string[]; }
interface DataAnalysis {
  executiveSummary: string; keyFindings: string[]; trends: string[]; anomalies: string[];
  businessImpact: string; recommendations: string[]; risks: string[]; opportunities: string[]; nextBestActions: string[];
}
interface Narrative { title: string; story: string; highlights: string[]; }
interface ErrorRecovery { friendlyMessage: string; suggestions: string[]; suggestedQuestion?: string; availableTables?: string[]; availableColumns?: string[]; }
interface KpiCard { label: string; value: string; rawValue: number; change?: string; trend?: "up" | "down" | "flat"; icon?: string; }
interface DashboardWidget { type: "kpi" | "chart" | "table"; title: string; data?: Record<string, unknown>[]; kpi?: KpiCard; chartType?: "bar" | "line" | "area" | "pie"; xKey?: string; yKeys?: string[]; }
interface DashboardConfig { title: string; widgets: DashboardWidget[]; generatedFrom: string; }

interface ChatResult {
  sql: string; explanation: string; confidence: number; confidenceBreakdown?: ConfidenceBreakdown;
  corrected?: boolean; originalSql?: string;
  rows: Record<string, unknown>[]; rowCount: number; executionMs: number; costEstimate?: string;
  blocked?: boolean; blockedReason?: string; error?: string; errorRecovery?: ErrorRecovery;
  insights: string[]; suggestions: string[];
  analysis?: DataAnalysis; narrative?: Narrative; sqlTeacher?: SqlTeacher;
  agentTrace?: AgentStep[]; chartType?: string; chartXKey?: string; chartYKeys?: string[]; kpis?: KpiCard[];
  prediction?: Prediction; strategy?: StrategyRecommendation;
}

// ------------------------------------------------------------
// Supabase admin client
// ------------------------------------------------------------
function adminClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return createClient(url, key, { auth: { persistSession: false } });
}

// ------------------------------------------------------------
// Schema discovery
// ------------------------------------------------------------
async function readSchema(): Promise<SchemaInfo> {
  const supa = adminClient();
  const { data, error } = await supa.rpc("get_schema_info");
  if (error) throw new Error("schema read failed: " + error.message);
  const tables = (data?.tables ?? []) as TableInfo[];
  return { tables };
}

function schemaToText(schema: SchemaInfo): string {
  return schema.tables.map(t =>
    `${t.table_name}(${t.columns.map(c => `${c.column_name}:${c.data_type}`).join(", ")})`
  ).join("\n");
}

function getTableNames(schema: SchemaInfo): string[] {
  return schema.tables.map(t => t.table_name);
}

function getAllColumns(schema: SchemaInfo): string[] {
  return schema.tables.flatMap(t => t.columns.map(c => `${t.table_name}.${c.column_name}`));
}

// ------------------------------------------------------------
// Read-only validation (Security Agent)
// ------------------------------------------------------------
function validateReadOnly(sql: string): { ok: boolean; reason?: string } {
  const clean = sql.trim().replace(/;\s*$/, "").trim();
  if (clean.includes(";")) return { ok: false, reason: "Multiple statements are not allowed." };
  const upper = clean.toUpperCase();
  if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
    return { ok: false, reason: "Only SELECT statements are allowed." };
  }
  for (const kw of FORBIDDEN) {
    const re = new RegExp(`(^|[^A-Z_])${kw}([^A-Z_]|$)`, "i");
    if (re.test(upper)) return { ok: false, reason: `Forbidden keyword "${kw}" detected.` };
  }
  return { ok: true };
}

// ------------------------------------------------------------
// Query execution
// ------------------------------------------------------------
async function executeQuery(sql: string): Promise<{ rows: Record<string, unknown>[]; rowCount: number; executionMs: number; error?: string }> {
  const supa = adminClient();
  const { data, error } = await supa.rpc("run_readonly_query", { p_sql: sql });
  if (error) return { rows: [], rowCount: 0, executionMs: 0, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  const rows = (row?.rows ?? []) as Record<string, unknown>[];
  return { rows, rowCount: row?.row_count ?? rows.length, executionMs: row?.execution_ms ?? 0 };
}

// ------------------------------------------------------------
// Query cost estimate
// ------------------------------------------------------------
function estimateCost(sql: string, rowCount: number): string {
  const joins = (sql.match(/\bjoin\b/gi) ?? []).length;
  const hasAgg = /\b(sum|avg|count|min|max)\b/gi.test(sql);
  const hasSub = /\b(exists|in\s*\(|subquery)\b/gi.test(sql);
  let cost = 1;
  if (joins) cost += joins * 2;
  if (hasAgg) cost += 1;
  if (hasSub) cost += 2;
  if (rowCount > 100) cost += 1;
  if (cost <= 2) return "Very Low";
  if (cost <= 4) return "Low";
  if (cost <= 6) return "Medium";
  if (cost <= 8) return "High";
  return "Very High";
}

// ============================================================
// AGENT 1: Planner — understand intent, rewrite ambiguous questions
// ============================================================
function plannerAgent(question: string, history: { role: string; content: string }[]): { rewritten: string; intent: string } {
  const q = question.toLowerCase().trim();
  const histUserMsgs = history.filter(h => h.role === "user").slice(-3).map(h => h.content.toLowerCase());
  const lastCtx = histUserMsgs.join(" ");

  let rewritten = question;
  let intent = "data retrieval";

  // Detect follow-up patterns and merge with context
  const isFollowUp = /^(only|just|exclude|compare|sort|group|show|visualize|limit|top|bottom|now|this year|last year|monthly|weekly|daily)/.test(q) && history.length > 0;

  if (isFollowUp && lastCtx) {
    // Determine what the last query was about
    if (/revenue|sales|trend/.test(lastCtx)) {
      if (/only this year|this year/.test(q)) {
        rewritten = `Monthly revenue trend for the current year, completed orders only`;
      } else if (/(only|just)\s+(completed|pending|shipped|cancelled)/.test(q)) {
        const st = q.match(/(completed|pending|shipped|cancelled)/)?.[0] ?? "completed";
        rewritten = `Monthly revenue trend for ${st} orders only`;
      } else if (/compare with last year|previous year/.test(q)) {
        rewritten = `Compare monthly revenue this year versus last year, completed orders only`;
      } else if (/sort descending|sort desc/.test(q)) {
        rewritten = `Top customers by revenue sorted descending`;
      } else if (/limit to\s+\d+|top\s+\d+/.test(q)) {
        const n = q.match(/\d+/)?.[0] ?? "5";
        rewritten = `Top ${n} customers by completed-order revenue`;
      } else if (/group by city|by city/.test(q)) {
        rewritten = `Revenue by city for completed orders`;
      } else if (/visualize monthly|monthly/.test(q)) {
        rewritten = `Monthly sales trend for completed orders`;
      }
      intent = "follow-up refinement";
    } else if (/customer/.test(lastCtx)) {
      if (/(only|just)\s+from\s+\w+/.test(q)) {
        const city = q.match(/from\s+(\w+(?:\s+\w+)?)/)?.[1] ?? "";
        rewritten = `Customers from ${city}`;
      } else if (/top\s+\d+/.test(q)) {
        const n = q.match(/\d+/)?.[0] ?? "5";
        rewritten = `Top ${n} customers by revenue`;
      }
      intent = "follow-up refinement";
    }
  }

  // Detect dashboard intent
  if (/create.*dashboard|build.*dashboard|sales dashboard/.test(q)) {
    intent = "dashboard generation";
  }

  // Detect aggregation intent
  if (/\b(sum|total|average|count|how many|revenue)\b/.test(q)) intent = "aggregation";
  if (/\b(trend|over time|monthly|yearly)\b/.test(q)) intent = "trend analysis";
  if (/\b(compare|versus|vs)\b/.test(q)) intent = "comparison";

  return { rewritten, intent };
}

// ============================================================
// AGENT 2: SQL Generator — generate PostgreSQL query
// ============================================================
async function sqlGeneratorAgent(
  question: string, history: { role: string; content: string }[], schema: SchemaInfo
): Promise<{ sql: string; explanation: string; confidence: number }> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (apiKey) {
    try {
      return await openAiGenerate(question, history, schema);
    } catch { /* fall through */ }
  }
  return heuristicGenerate(question, history, schema);
}

async function openAiGenerate(question: string, history: { role: string; content: string }[], schema: SchemaInfo): Promise<{ sql: string; explanation: string; confidence: number }> {
  const apiKey = Deno.env.get("OPENAI_API_KEY")!;
  const schemaText = schemaToText(schema);
  const historyText = history.slice(-3).map(h => `${h.role}: ${h.content}`).join("\n");

  const systemPrompt = `You are QueryMind, an expert PostgreSQL assistant.
Given a user's natural-language question and the database schema, generate a single read-only PostgreSQL SELECT query.

Rules:
- Output ONLY valid JSON: {"sql": "...", "explanation": "...", "confidence": 0.0-1.0}
- No markdown, no prose outside JSON.
- Only SELECT statements. Never INSERT/UPDATE/DELETE/DROP/etc.
- Use the schema below. Use joins where appropriate.
- confidence reflects how well the query answers the question.

Schema:
${schemaText}

Previous conversation:
${historyText || "(none)"}`;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: question }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI error ${resp.status}`);
  const json = await resp.json();
  const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
  return {
    sql: parsed.sql ?? "", explanation: parsed.explanation ?? "",
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
  };
}

// Heuristic engine (preserves all existing patterns + adds new ones)
function heuristicGenerate(question: string, history: { role: string; content: string }[], _schema: SchemaInfo): { sql: string; explanation: string; confidence: number } {
  const q = question.toLowerCase().trim();
  const histQ = history.filter(h => h.role === "user").slice(-3).map(h => h.content.toLowerCase()).join(" ");
  const ctx = `${histQ} ${q}`;

  // Compare this year vs last year
  if (/compare.*year|year.*versus|year.*vs|this year.*last year|previous year/.test(q)) {
    return {
      sql: `SELECT EXTRACT(YEAR FROM o.order_date) AS year, ROUND(SUM(o.total_amount)::numeric, 2) AS revenue, COUNT(*) AS orders FROM orders o WHERE o.status = 'completed' GROUP BY year ORDER BY year;`,
      explanation: "Groups completed orders by year to compare annual revenue side by side.",
      confidence: 0.85,
    };
  }

  // Top N customers by revenue
  if (/top\s+\d+\s+customer|customers? by revenue|best customer|highest.*customer/.test(q)) {
    const n = (q.match(/top\s+(\d+)/) || [, "10"])[1];
    return {
      sql: `SELECT c.name, c.city, ROUND(SUM(o.total_amount)::numeric, 2) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'completed' GROUP BY c.id, c.name, c.city ORDER BY revenue DESC LIMIT ${parseInt(n)};`,
      explanation: `Finds the top ${n} customers by total completed-order revenue, joining customers to orders and summing total_amount per customer.`,
      confidence: 0.88,
    };
  }

  // Monthly sales trend
  if (/monthly|sales trend|revenue over time|revenue by month|trend/.test(q)) {
    return {
      sql: `SELECT TO_CHAR(o.order_date, 'YYYY-MM') AS month, ROUND(SUM(o.total_amount)::numeric, 2) AS revenue, COUNT(*) AS order_count FROM orders o WHERE o.status = 'completed' GROUP BY month ORDER BY month;`,
      explanation: "Groups completed orders by year-month, summing revenue and counting orders to show the monthly sales trend.",
      confidence: 0.86,
    };
  }

  // Average order value
  if (/average order|avg order|aov/.test(q)) {
    return {
      sql: `SELECT ROUND(AVG(total_amount)::numeric, 2) AS average_order_value, COUNT(*) AS total_orders FROM orders WHERE status = 'completed';`,
      explanation: "Calculates the average value of completed orders across the entire dataset.",
      confidence: 0.9,
    };
  }

  // Products never ordered
  if (/never ordered|not.*ordered|no orders|unpopular product|never been ordered/.test(q)) {
    return {
      sql: `SELECT p.name, p.category, p.price FROM products p WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id) ORDER BY p.price DESC;`,
      explanation: "Finds products that have never appeared in any order_item, using a NOT EXISTS subquery against order_items.",
      confidence: 0.87,
    };
  }

  // Customers from a city
  const cityMatch = q.match(/from\s+([a-z\s]+?)(?:\s+(?:only|sort|order|group|in|this|with|having|where|limit|top|$)|[.,?]|$)/);
  if (/customer.*from|from.*customer|customers in|in.*city/.test(q) && cityMatch) {
    const city = cityMatch[1].trim().replace(/\s+(year|this|only|completed|pending|cancelled)$/, "");
    const cities = ["new york", "chicago", "san francisco", "los angeles", "houston"];
    const matched = cities.find(c => city.includes(c) || c.includes(city));
    if (matched) {
      const cityTitle = matched.replace(/\b\w/g, m => m.toUpperCase());
      return {
        sql: `SELECT name, email, signup_date FROM customers WHERE city = '${cityTitle}' ORDER BY signup_date DESC;`,
        explanation: `Lists all customers located in ${cityTitle}, ordered by most recent signup.`,
        confidence: 0.85,
      };
    }
  }

  // Orders this year
  if (/orders? this year|this year.*orders?/.test(q)) {
    return {
      sql: `SELECT o.id, c.name AS customer, o.order_date, o.total_amount, o.status FROM orders o JOIN customers c ON c.id = o.customer_id WHERE EXTRACT(YEAR FROM o.order_date) = EXTRACT(YEAR FROM CURRENT_DATE) ORDER BY o.order_date DESC;`,
      explanation: "Returns all orders placed in the current calendar year, joined with customer names, newest first.",
      confidence: 0.84,
    };
  }

  // Revenue by category
  if (/revenue by category|revenue.*category|category.*revenue|sales by category/.test(q)) {
    return {
      sql: `SELECT p.category, ROUND(SUM(o.total_amount)::numeric, 2) AS revenue FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id WHERE o.status = 'completed' GROUP BY p.category ORDER BY revenue DESC;`,
      explanation: "Joins orders, order_items, and products to sum completed-order revenue per product category.",
      confidence: 0.86,
    };
  }

  // Cancelled orders
  if (/cancelled|canceled/.test(q)) {
    return {
      sql: `SELECT o.id, c.name AS customer, o.order_date, o.total_amount FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'cancelled' ORDER BY o.order_date DESC;`,
      explanation: "Lists all cancelled orders with the customer name and order date, newest first.",
      confidence: 0.9,
    };
  }

  // Most expensive products
  if (/most expensive|expensive product|priciest|highest price/.test(q)) {
    return {
      sql: `SELECT name, category, price FROM products ORDER BY price DESC LIMIT 10;`,
      explanation: "Returns the 10 most expensive products sorted by price descending.",
      confidence: 0.92,
    };
  }

  // Completed / pending / shipped orders
  for (const status of ["completed", "pending", "shipped"] as const) {
    if (new RegExp(`${status} orders|orders.*${status}`).test(q)) {
      return {
        sql: `SELECT o.id, c.name AS customer, o.order_date, o.total_amount FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = '${status}' ORDER BY o.order_date DESC;`,
        explanation: `Lists all ${status} orders with customer names, newest first.`,
        confidence: 0.9,
      };
    }
  }

  // All customers / products / orders
  if (/^(all|list|show).*customers?$|^customers?$/.test(q)) {
    return { sql: `SELECT name, email, city, signup_date FROM customers ORDER BY signup_date DESC;`, explanation: "Lists all customers with their city and signup date, newest first.", confidence: 0.9 };
  }
  if (/^(all|list|show).*products?$|^products?$/.test(q)) {
    return { sql: `SELECT name, category, price FROM products ORDER BY category, price DESC;`, explanation: "Lists all products grouped by category, most expensive within each category first.", confidence: 0.9 };
  }
  if (/^(all|list|show).*orders?$|^orders?$/.test(q)) {
    return { sql: `SELECT o.id, c.name AS customer, o.order_date, o.total_amount, o.status FROM orders o JOIN customers c ON c.id = o.customer_id ORDER BY o.order_date DESC;`, explanation: "Lists all orders with customer name, date, total, and status, newest first.", confidence: 0.9 };
  }

  // Count queries
  const countMatch = q.match(/(how many|count of|number of|total)\s+(.*)/);
  if (countMatch) {
    const subject = countMatch[2];
    if (/customer/.test(subject)) return { sql: `SELECT COUNT(*) AS total_customers FROM customers;`, explanation: "Counts the total number of customers.", confidence: 0.9 };
    if (/order/.test(subject)) return { sql: `SELECT COUNT(*) AS total_orders FROM orders;`, explanation: "Counts the total number of orders.", confidence: 0.9 };
    if (/product/.test(subject)) return { sql: `SELECT COUNT(*) AS total_products FROM products;`, explanation: "Counts the total number of products.", confidence: 0.9 };
  }

  // Total revenue
  if (/total revenue|revenue total|sum.*revenue|how much.*revenue/.test(q)) {
    return { sql: `SELECT ROUND(SUM(total_amount)::numeric, 2) AS total_revenue FROM orders WHERE status = 'completed';`, explanation: "Sums the total_amount of all completed orders to get total revenue.", confidence: 0.9 };
  }

  // Revenue by city / customer
  if (/revenue by city|revenue.*city|city.*revenue|sales by city/.test(q)) {
    return { sql: `SELECT c.city, ROUND(SUM(o.total_amount)::numeric, 2) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'completed' GROUP BY c.city ORDER BY revenue DESC;`, explanation: "Joins customers to orders and sums completed-order revenue per city.", confidence: 0.86 };
  }
  if (/revenue by customer|customer.*revenue|revenue per customer/.test(q)) {
    return { sql: `SELECT c.name, c.city, ROUND(SUM(o.total_amount)::numeric, 2) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'completed' GROUP BY c.id, c.name, c.city ORDER BY revenue DESC;`, explanation: "Sums completed-order revenue per customer, including their city.", confidence: 0.86 };
  }

  // Orders by status
  if (/orders? by status|status.*count|order status/.test(q)) {
    return { sql: `SELECT status, COUNT(*) AS count FROM orders GROUP BY status ORDER BY count DESC;`, explanation: "Counts how many orders exist for each status value.", confidence: 0.9 };
  }

  // Products by category
  if (/products? by category|category.*count|products per category/.test(q)) {
    return { sql: `SELECT category, COUNT(*) AS product_count, ROUND(AVG(price)::numeric, 2) AS avg_price FROM products GROUP BY category ORDER BY product_count DESC;`, explanation: "Counts products and averages price within each category.", confidence: 0.88 };
  }

  // Conversational follow-ups
  if (/(only|just)\s+(completed|pending|shipped|cancelled)/.test(ctx)) {
    const statusMatch = ctx.match(/(only|just)\s+(completed|pending|shipped|cancelled)/);
    if (statusMatch && /revenue|sales|trend/.test(ctx)) {
      const status = statusMatch[2];
      return { sql: `SELECT TO_CHAR(o.order_date, 'YYYY-MM') AS month, ROUND(SUM(o.total_amount)::numeric, 2) AS revenue, COUNT(*) AS order_count FROM orders o WHERE o.status = '${status}' GROUP BY month ORDER BY month;`, explanation: `Monthly revenue trend restricted to ${status} orders only.`, confidence: 0.8 };
    }
  }

  if (/this year/.test(q) && /revenue|sales|trend/.test(ctx)) {
    return { sql: `SELECT TO_CHAR(o.order_date, 'YYYY-MM') AS month, ROUND(SUM(o.total_amount)::numeric, 2) AS revenue, COUNT(*) AS order_count FROM orders o WHERE o.status = 'completed' AND EXTRACT(YEAR FROM o.order_date) = EXTRACT(YEAR FROM CURRENT_DATE) GROUP BY month ORDER BY month;`, explanation: "Monthly revenue trend for the current calendar year, completed orders only.", confidence: 0.82 };
  }

  const limitMatch = q.match(/limit\s+(?:to\s+)?(\d+)/);
  if (limitMatch && /revenue|sales|customer/.test(ctx)) {
    const n = parseInt(limitMatch[1]);
    return { sql: `SELECT c.name, c.city, ROUND(SUM(o.total_amount)::numeric, 2) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'completed' GROUP BY c.id, c.name, c.city ORDER BY revenue DESC LIMIT ${n};`, explanation: `Top ${n} customers by completed-order revenue, sorted descending.`, confidence: 0.78 };
  }

  // Exclude cancelled
  if (/exclude.*cancelled|without.*cancelled|not.*cancelled/.test(q) && /revenue|sales/.test(ctx)) {
    return { sql: `SELECT TO_CHAR(o.order_date, 'YYYY-MM') AS month, ROUND(SUM(o.total_amount)::numeric, 2) AS revenue FROM orders o WHERE o.status != 'cancelled' GROUP BY month ORDER BY month;`, explanation: "Monthly revenue excluding cancelled orders.", confidence: 0.79 };
  }

  // Best-effort fallbacks
  if (/customer/.test(q)) return { sql: `SELECT name, email, city, signup_date FROM customers ORDER BY signup_date DESC LIMIT 20;`, explanation: "Lists the 20 most recently signed-up customers. (Best-effort interpretation.)", confidence: 0.4 };
  if (/product/.test(q)) return { sql: `SELECT name, category, price FROM products ORDER BY price DESC LIMIT 20;`, explanation: "Lists the 20 most expensive products. (Best-effort interpretation.)", confidence: 0.4 };
  if (/order/.test(q)) return { sql: `SELECT o.id, c.name AS customer, o.order_date, o.total_amount, o.status FROM orders o JOIN customers c ON c.id = o.customer_id ORDER BY o.order_date DESC LIMIT 20;`, explanation: "Lists the 20 most recent orders with customer details. (Best-effort interpretation.)", confidence: 0.4 };

  return { sql: `SELECT name, email, city, signup_date FROM customers ORDER BY signup_date DESC LIMIT 10;`, explanation: "I wasn't sure how to interpret your question, so I'm showing the 10 most recent customers. Try asking about revenue, orders by status, products by category, or customers by city.", confidence: 0.2 };
}

// ============================================================
// AGENT 3: Security — validate SQL (uses validateReadOnly)
// ============================================================
// (handled inline in main flow)

// ============================================================
// AGENT 4: SQL Repair — fix failed SQL
// ============================================================
async function sqlRepairAgent(originalSql: string, dbError: string, question: string, schema: SchemaInfo, usedOpenAI: boolean): Promise<{ sql: string; explanation: string; confidence: number } | null> {
  if (usedOpenAI) {
    try {
      const fixed = await openAiGenerate(
        `The previous SQL failed with this error: ${dbError}. Fix the SQL. Original question: ${question}`,
        [], schema
      );
      if (fixed.sql && fixed.sql !== originalSql) return fixed;
    } catch { /* fall through */ }
  }
  // Heuristic repair: try a simpler query
  const fallback = heuristicGenerate(question, [], schema);
  if (fallback.sql && fallback.sql !== originalSql) return fallback;
  return null;
}

// ============================================================
// AGENT 5: Visualization — choose best chart
// ============================================================
function visualizationAgent(rows: Record<string, unknown>[]): { chartType: string; xKey?: string; yKeys: string[] } {
  if (!rows.length) return { chartType: "none", yKeys: [] };
  const keys = Object.keys(rows[0]);
  const numericKeys: string[] = [];
  const textKeys: string[] = [];
  for (const k of keys) {
    const sample = rows.slice(0, 5).map(r => r[k]).filter(v => v !== null && v !== undefined);
    if (!sample.length) continue;
    const allNumeric = sample.every(v => typeof v === "number" || (typeof v === "string" && !isNaN(parseFloat(v)) && /^\s*[\d.,$]+\s*$/.test(v)));
    if (allNumeric) numericKeys.push(k);
    else textKeys.push(k);
  }
  if (!numericKeys.length) return { chartType: "none", yKeys: [] };

  const xKey = textKeys[0] ?? keys[0];
  let yKeys = numericKeys;
  if (yKeys.length > 1) yKeys = [numericKeys[0]];

  let chartType = "bar";
  if (textKeys.length && numericKeys.length === 1 && rows.length <= 12) chartType = "pie";
  else if (/month|date|year|time/.test(xKey.toLowerCase())) chartType = "line";

  return { chartType, xKey, yKeys };
}

// ============================================================
// AGENT 6: Business Insight — analyze returned data
// ============================================================
function insightAgent(rows: Record<string, unknown>[], question: string): string[] {
  const insights: string[] = [];
  if (!rows.length) return ["No rows returned — the query matched no records."];

  const keys = Object.keys(rows[0]);
  const numericKeys = keys.filter(k => rows.some(r => typeof r[k] === "number" || (typeof r[k] === "string" && !isNaN(parseFloat(String(r[k]))))));

  for (const k of numericKeys) {
    const vals = rows.map(r => parseFloat(String(r[k]))).filter(v => !isNaN(v));
    if (!vals.length) continue;
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const maxRow = rows[vals.indexOf(max)];
    const labelKey = keys.find(kk => kk !== k && typeof maxRow[kk] === "string");

    if (labelKey && vals.length > 1) insights.push(`Highest ${k}: ${maxRow[labelKey]} at ${max.toLocaleString()}.`);
    if (vals.length > 1) insights.push(`Average ${k} across ${vals.length} rows: ${avg.toFixed(2)}.`);
    if (vals.length === 1) insights.push(`${k}: ${max.toLocaleString()}.`);
  }

  const textKeys = keys.filter(k => typeof rows[0][k] === "string" && !numericKeys.includes(k));
  for (const k of textKeys) {
    const counts: Record<string, number> = {};
    for (const r of rows) { const v = String(r[k]); counts[v] = (counts[v] ?? 0) + 1; }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length > 1 && entries.length <= 8) {
      const [top, count] = entries[0];
      const pct = Math.round((count / rows.length) * 100);
      insights.push(`${top} accounts for ${pct}% of ${k} values.`);
    }
  }

  if (!insights.length) insights.push(`${rows.length} rows returned.`);
  return insights.slice(0, 4);
}

// ============================================================
// AGENT 6b: Deep Data Analysis (executive summary, findings, etc.)
// ============================================================
function dataAnalysisAgent(rows: Record<string, unknown>[], question: string, schema: SchemaInfo): DataAnalysis {
  if (!rows.length) {
    return {
      executiveSummary: "The query returned no results. This may indicate the criteria were too restrictive or no matching data exists.",
      keyFindings: ["No data matched the query criteria."],
      trends: [], anomalies: ["Empty result set — possible filter mismatch."],
      businessImpact: "Without matching data, no direct business impact can be assessed.",
      recommendations: ["Try broadening your criteria or removing filters.", "Verify the question maps to existing data."],
      risks: ["Over-filtering may hide relevant data."],
      opportunities: ["Explore alternative groupings or time ranges."],
      nextBestActions: ["Ask: 'Show all records' to see what data exists.", "Ask: 'What tables are available?'"],
    };
  }

  const keys = Object.keys(rows[0]);
  const numericKeys = keys.filter(k => rows.some(r => typeof r[k] === "number" || (typeof r[k] === "string" && !isNaN(parseFloat(String(r[k]))))));
  const textKeys = keys.filter(k => typeof rows[0][k] === "string" && !numericKeys.includes(k));

  // Compute stats
  const stats: Record<string, { sum: number; avg: number; max: number; min: number; maxLabel: string; minLabel: string }> = {};
  for (const k of numericKeys) {
    const vals = rows.map(r => parseFloat(String(r[k]))).filter(v => !isNaN(v));
    if (!vals.length) continue;
    const labelKey = textKeys[0] ?? keys[0];
    const maxIdx = vals.indexOf(Math.max(...vals));
    const minIdx = vals.indexOf(Math.min(...vals));
    stats[k] = {
      sum: vals.reduce((a, b) => a + b, 0),
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      max: Math.max(...vals),
      min: Math.min(...vals),
      maxLabel: String(rows[maxIdx]?.[labelKey] ?? "N/A"),
      minLabel: String(rows[minIdx]?.[labelKey] ?? "N/A"),
    };
  }

  // Key findings
  const keyFindings: string[] = [];
  for (const [k, s] of Object.entries(stats)) {
    keyFindings.push(`${k} ranges from ${s.min.toLocaleString()} (${s.minLabel}) to ${s.max.toLocaleString()} (${s.maxLabel}).`);
    keyFindings.push(`Total ${k}: ${s.sum.toLocaleString()}; average: ${s.avg.toFixed(2)}.`);
  }

  // Categorical distribution findings
  const catDist: string[] = [];
  for (const k of textKeys) {
    const counts: Record<string, number> = {};
    for (const r of rows) { const v = String(r[k]); counts[v] = (counts[v] ?? 0) + 1; }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length > 1 && entries.length <= 10) {
      const [top, count] = entries[0];
      const pct = Math.round((count / rows.length) * 100);
      catDist.push(`${top} represents ${pct}% of ${k} (${count} of ${rows.length} rows).`);
    }
  }
  keyFindings.push(...catDist.slice(0, 3));

  // Trends
  const trends: string[] = [];
  if (numericKeys.length && rows.length > 1) {
    const firstVal = parseFloat(String(rows[0][numericKeys[0]]));
    const lastVal = parseFloat(String(rows[rows.length - 1][numericKeys[0]]));
    if (!isNaN(firstVal) && !isNaN(lastVal)) {
      const change = lastVal - firstVal;
      const pctChange = firstVal !== 0 ? ((change / firstVal) * 100).toFixed(1) : "N/A";
      trends.push(`${numericKeys[0]} ${change >= 0 ? "increased" : "decreased"} by ${Math.abs(change).toLocaleString()} (${pctChange}%) from first to last row.`);
    }
  }
  if (catDist.length) trends.push(...catDist.slice(0, 2));

  // Anomalies
  const anomalies: string[] = [];
  for (const [k, s] of Object.entries(stats)) {
    if (s.max > s.avg * 3) anomalies.push(`${s.maxLabel} has an unusually high ${k} (${s.max.toLocaleString()} vs average ${s.avg.toFixed(2)}).`);
    if (s.min < s.avg * 0.1 && s.min !== s.max) anomalies.push(`${s.minLabel} has an unusually low ${k} (${s.min.toLocaleString()} vs average ${s.avg.toFixed(2)}).`);
  }
  if (!anomalies.length) anomalies.push("No significant anomalies detected in the current dataset.");

  // Executive summary
  const topMetric = numericKeys[0] ? stats[numericKeys[0]] : null;
  let executiveSummary: string;
  if (topMetric) {
    executiveSummary = `This query analyzed ${rows.length} records${textKeys.length ? ` across ${textKeys.length} ${textKeys[0]} values` : ""}. The ${numericKeys[0]} metric shows a total of ${topMetric.sum.toLocaleString()} with an average of ${topMetric.avg.toFixed(2)}. `;
    if (catDist.length) executiveSummary += `${catDist[0]} `;
    if (trends.length) executiveSummary += `${trends[0]}`;
  } else {
    executiveSummary = `This query returned ${rows.length} records. The data contains ${textKeys.length} text column(s): ${textKeys.join(", ")}.`;
  }

  // Business impact
  const businessImpact = `The results reveal ${rows.length} data points${topMetric ? ` with ${numericKeys[0]} totaling ${topMetric.sum.toLocaleString()}` : ""}. ${catDist[0] ?? "The distribution appears relatively even."} This suggests ${topMetric && topMetric.max > topMetric.avg * 2 ? "a concentration of value in specific segments" : "a balanced distribution across the dataset"}.`;

  // Recommendations
  const recommendations: string[] = [];
  if (topMetric) {
    recommendations.push(`Focus on ${topMetric.maxLabel} which leads in ${numericKeys[0]} at ${topMetric.max.toLocaleString()}.`);
    recommendations.push(`Investigate ${topMetric.minLabel} which has the lowest ${numericKeys[0]} at ${topMetric.min.toLocaleString()}.`);
  }
  if (catDist.length) recommendations.push(`Leverage the dominant category: ${catDist[0]}`);
  recommendations.push("Consider segmenting by additional dimensions for deeper insight.");

  // Risks
  const risks: string[] = [];
  if (anomalies.length > 1) risks.push("Multiple anomalies detected — verify data quality.");
  risks.push("Small sample size may limit statistical significance.");
  if (topMetric && topMetric.max > topMetric.avg * 3) risks.push(`Over-reliance on ${topMetric.maxLabel} creates concentration risk.`);

  // Opportunities
  const opportunities: string[] = [];
  if (topMetric) opportunities.push(`Growth opportunity in ${topMetric.minLabel} — currently underperforming at ${topMetric.min.toLocaleString()}.`);
  if (catDist.length) opportunities.push("Expand the dominant segment to capture more market share.");
  opportunities.push("Cross-sell between high and low performing segments.");

  // Next best actions
  const nextBestActions: string[] = [
    "Drill deeper into the top-performing segment.",
    "Compare results with a different time period.",
    "Break down by an additional dimension (city, category, etc.).",
    "Export this data for further analysis or sharing.",
  ];

  return {
    executiveSummary, keyFindings: keyFindings.slice(0, 5), trends: trends.slice(0, 3),
    anomalies: anomalies.slice(0, 3), businessImpact, recommendations: recommendations.slice(0, 4),
    risks: risks.slice(0, 3), opportunities: opportunities.slice(0, 3), nextBestActions: nextBestActions.slice(0, 4),
  };
}

// ============================================================
// AGENT 6c: Storytelling — narrative over the data
// ============================================================
function storytellingAgent(rows: Record<string, unknown>[], question: string): Narrative {
  if (!rows.length) {
    return { title: "No Story to Tell", story: "The query returned no results, so there's no narrative to build.", highlights: [] };
  }

  const keys = Object.keys(rows[0]);
  const numericKeys = keys.filter(k => rows.some(r => typeof r[k] === "number" || (typeof r[k] === "string" && !isNaN(parseFloat(String(r[k]))))));
  const textKeys = keys.filter(k => typeof rows[0][k] === "string" && !numericKeys.includes(k));

  const title = question.length > 60 ? question.slice(0, 57) + "..." : question;

  // Build narrative
  const parts: string[] = [];
  parts.push(`This analysis examines ${rows.length} records${textKeys.length ? ` across ${textKeys.length} ${textKeys[0]} values` : ""}.`);

  if (numericKeys.length) {
    const k = numericKeys[0];
    const vals = rows.map(r => parseFloat(String(r[k]))).filter(v => !isNaN(v));
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const labelKey = textKeys[0] ?? keys[0];
    const maxLabel = String(rows[vals.indexOf(max)]?.[labelKey] ?? "the top entry");
    const minLabel = String(rows[vals.indexOf(min)]?.[labelKey] ?? "the bottom entry");

    parts.push(`${k} totals ${sum.toLocaleString()} with an average of ${avg.toFixed(2)} per entry.`);
    parts.push(`${maxLabel} leads with ${max.toLocaleString()}, while ${minLabel} trails at ${min.toLocaleString()}.`);

    if (vals.length > 2) {
      const firstVal = vals[0];
      const lastVal = vals[vals.length - 1];
      const change = ((lastVal - firstVal) / firstVal * 100).toFixed(1);
      parts.push(`From the first to the last entry, ${k} ${parseFloat(change) >= 0 ? "grew" : "declined"} by ${Math.abs(parseFloat(change))}%.`);
    }
  }

  if (textKeys.length) {
    const k = textKeys[0];
    const counts: Record<string, number> = {};
    for (const r of rows) { const v = String(r[k]); counts[v] = (counts[v] ?? 0) + 1; }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length > 1) {
      const [top, count] = entries[0];
      const pct = Math.round((count / rows.length) * 100);
      parts.push(`${top} dominates with ${pct}% of the ${k} distribution.`);
    }
  }

  parts.push("Overall, the data reveals clear patterns that can inform strategic decisions.");

  const highlights: string[] = [];
  if (numericKeys.length) {
    const k = numericKeys[0];
    const vals = rows.map(r => parseFloat(String(r[k]))).filter(v => !isNaN(v));
    highlights.push(`Total ${k}: ${vals.reduce((a, b) => a + b, 0).toLocaleString()}`);
    highlights.push(`Average ${k}: ${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)}`);
    highlights.push(`${rows.length} records analyzed`);
  }

  return { title, story: parts.join(" "), highlights };
}

// ============================================================
// AGENT 7: Report — executive summary (uses dataAnalysisAgent)
// ============================================================
// (integrated into dataAnalysisAgent output)

// ============================================================
// AGENT 8: Follow-up — suggest intelligent next questions
// ============================================================
function followUpAgent(question: string, rows: Record<string, unknown>[]): string[] {
  const q = question.toLowerCase();
  const suggestions: string[] = [];
  const keys = rows.length ? Object.keys(rows[0]) : [];

  if (/revenue|sales/.test(q)) {
    suggestions.push("Compare with last year", "Group by city", "Show only this year", "Break down by category");
  } else if (/customer/.test(q)) {
    suggestions.push("Top 5 by revenue", "Only from Chicago", "Show their orders", "Group by city");
  } else if (/product/.test(q)) {
    suggestions.push("Group by category", "Products never ordered", "Most expensive 5", "Revenue by category");
  } else if (/order/.test(q)) {
    suggestions.push("Only completed orders", "Orders this year", "Average order value", "Orders by status");
  } else {
    suggestions.push("Top 10 customers by revenue", "Monthly sales trend", "Revenue by category", "Orders by status");
  }

  if (keys.some(k => /city/i.test(k))) suggestions.push("Group by city");
  if (keys.some(k => /month|date/i.test(k))) suggestions.push("Compare with last year");
  if (keys.some(k => /category/i.test(k))) suggestions.push("Break down by category");

  return [...new Set(suggestions)].slice(0, 4);
}

// ============================================================
// Confidence Breakdown Agent
// ============================================================
function confidenceBreakdownAgent(sql: string, question: string, schema: SchemaInfo, baseConfidence: number): ConfidenceBreakdown {
  const tableNames = getTableNames(schema);
  const allColumns = getAllColumns(schema);

  // Schema match: do referenced tables exist?
  const referencedTables = (sql.match(/(?:from|join)\s+([a-z_][a-z0-9_]*)/gi) ?? []).map(m => m.split(/\s+/)[1]);
  const tableMatches = referencedTables.filter(t => tableNames.includes(t)).length;
  const schemaMatch = referencedTables.length ? tableMatches / referencedTables.length : 0.5;

  // Column match: do referenced columns exist?
  const referencedCols = (sql.match(/\b([a-z_][a-z0-9_]*)\s*(?:=|<|>|<=|>=|!=|<>|as|,|\)|\s)/gi) ?? []).map(m => m.trim().split(/\s/)[0]);
  const colMatches = referencedCols.filter(c => allColumns.some(ac => ac.endsWith(`.${c}`))).length;
  const columnMatch = referencedCols.length ? Math.min(colMatches / referencedCols.length, 1) : 0.7;

  // Join confidence: are joins between tables that have FK relationships?
  const joins = (sql.match(/join\s+[a-z_][a-z0-9_]*\s+[^;]+on\s+[^;]+/gi) ?? []).length;
  const joinConfidence = joins > 0 ? Math.min(0.8 + joins * 0.05, 1) : 0.9;

  // Aggregation confidence
  const hasAgg = /\b(sum|avg|count|min|max|group by)\b/i.test(sql);
  const needsAgg = /\b(total|sum|average|count|how many|revenue by|sales by)\b/i.test(question);
  const aggregationConfidence = needsAgg ? (hasAgg ? 0.9 : 0.4) : (hasAgg ? 0.7 : 0.9);

  const overall = Math.round((schemaMatch * 0.3 + columnMatch * 0.25 + joinConfidence * 0.2 + aggregationConfidence * 0.25) * 100) / 100;

  const reasoning: string[] = [];
  reasoning.push(`Schema match: ${Math.round(schemaMatch * 100)}% — ${tableMatches}/${referencedTables.length} tables found.`);
  reasoning.push(`Column match: ${Math.round(columnMatch * 100)}% — columns resolved against schema.`);
  reasoning.push(`Join confidence: ${Math.round(joinConfidence * 100)}% — ${joins} join(s) detected.`);
  reasoning.push(`Aggregation: ${Math.round(aggregationConfidence * 100)}% — ${hasAgg ? "aggregation used" : "no aggregation needed"}.`);

  return { schemaMatch, columnMatch, joinConfidence, aggregationConfidence, overall: Math.min(overall, baseConfidence), reasoning };
}

// ============================================================
// SQL Teacher Agent — clause-by-clause educational explanation
// ============================================================
function sqlTeacherAgent(sql: string): SqlTeacher {
  const upper = sql.toUpperCase();
  const clauses: SqlClauseExplanation[] = [];
  const concepts: string[] = [];
  const purpose = "This query retrieves data from the database to answer your question.";

  if (/^SELECT/.test(upper)) {
    clauses.push({ clause: "SELECT", keyword: "SELECT", explanation: "Specifies which columns to retrieve. Think of it as choosing what information you want to see." });
  }
  if (/\bFROM\b/.test(upper)) {
    const fromTable = sql.match(/from\s+([a-z_][a-z0-9_]*)/i)?.[1] ?? "a table";
    clauses.push({ clause: "FROM", keyword: "FROM", explanation: `Specifies the main table (${fromTable}) to read data from. This is your starting point.` });
  }
  if (/\bJOIN\b/.test(upper)) {
    const joinCount = (sql.match(/\bJOIN\b/gi) ?? []).length;
    clauses.push({ clause: "JOIN", keyword: "JOIN", explanation: `Combines rows from two or more tables based on a related column. This query uses ${joinCount} join(s) to connect related data.` });
    concepts.push("JOIN — combines data from multiple tables using a shared column");
  }
  if (/\bWHERE\b/.test(upper)) {
    clauses.push({ clause: "WHERE", keyword: "WHERE", explanation: "Filters rows to only include those matching the condition. Think of it as a filter that keeps only the data you care about." });
  }
  if (/\bGROUP BY\b/.test(upper)) {
    clauses.push({ clause: "GROUP BY", keyword: "GROUP BY", explanation: "Groups rows that have the same values into summary rows. Used with aggregations like SUM or COUNT to get totals per group." });
    concepts.push("GROUP BY — groups rows with the same values for aggregation");
  }
  if (/\bHAVING\b/.test(upper)) {
    clauses.push({ clause: "HAVING", keyword: "HAVING", explanation: "Filters groups after GROUP BY, similar to WHERE but for aggregated results." });
  }
  if (/\bORDER BY\b/.test(upper)) {
    const dir = /\bDESC\b/i.test(sql) ? "descending (highest first)" : "ascending (lowest first)";
    clauses.push({ clause: "ORDER BY", keyword: "ORDER BY", explanation: `Sorts the results by a specific column in ${dir} order.` });
  }
  if (/\bLIMIT\b/.test(upper)) {
    const n = sql.match(/limit\s+(\d+)/i)?.[1] ?? "N";
    clauses.push({ clause: "LIMIT", keyword: "LIMIT", explanation: `Restricts the output to the first ${n} rows. Useful for getting the "top N" results.` });
  }
  if (/\bSUM\b/i.test(sql)) { concepts.push("SUM — adds up all numeric values in a group"); }
  if (/\bAVG\b/i.test(sql)) { concepts.push("AVG — calculates the average of numeric values"); }
  if (/\bCOUNT\b/i.test(sql)) { concepts.push("COUNT — counts the number of rows"); }
  if (/\bROUND\b/i.test(sql)) { concepts.push("ROUND — rounds a number to specified decimal places"); }
  if (/\bEXTRACT\b/i.test(sql)) { concepts.push("EXTRACT — pulls a component (year, month) from a date"); }
  if (/\bTO_CHAR\b/i.test(sql)) { concepts.push("TO_CHAR — formats a date or number as text"); }
  if (/\bNOT EXISTS\b/i.test(sql)) { concepts.push("NOT EXISTS — checks that no matching rows exist in a subquery"); }
  if (/\bOVER\b/i.test(sql) || /\bROW_NUMBER\b/i.test(sql) || /\bRANK\b/i.test(sql)) {
    concepts.push("Window Function — performs calculation across related rows without collapsing them");
  }

  return { purpose, clauses, concepts };
}

// ============================================================
// Smart Error Recovery Agent
// ============================================================
function errorRecoveryAgent(error: string, sql: string, question: string, schema: SchemaInfo): ErrorRecovery {
  const tableNames = getTableNames(schema);
  const allColumns = getAllColumns(schema);
  const lowerErr = error.toLowerCase();

  // Missing table
  const missingTableMatch = error.match(/relation "(\w+)" does not exist/i) ?? error.match(/could not find the table "([^"]+)"/i);
  if (missingTableMatch) {
    const missing = missingTableMatch[1];
    // Find similar table
    const similar = tableNames.find(t => t.includes(missing.toLowerCase().slice(0, 4)) || missing.toLowerCase().includes(t.slice(0, 4)));
    return {
      friendlyMessage: `There is no "${missing}" table in this database.${similar ? ` Did you mean "${similar}"?` : ""}`,
      suggestions: tableNames.map(t => `Show all records from ${t}`),
      suggestedQuestion: similar ? `Show all records from ${similar}` : undefined,
      availableTables: tableNames,
    };
  }

  // Missing column
  const missingColMatch = error.match(/column "([^"]+)" does not exist/i) ?? error.match(/column "([^"]+)" of relation/i);
  if (missingColMatch) {
    const missing = missingColMatch[1];
    const similar = allColumns.find(c => c.endsWith(`.${missing}`) || c.includes(missing.toLowerCase()));
    return {
      friendlyMessage: `There is no "${missing}" column.${similar ? ` Did you mean "${similar}"?` : ""}`,
      suggestions: [`What columns are available?`, `Show sample data`],
      suggestedQuestion: similar ? `Show ${similar.split(".")[0]} data` : undefined,
      availableColumns: allColumns,
    };
  }

  // Syntax error
  if (/syntax error|unexpected/i.test(lowerErr)) {
    return {
      friendlyMessage: "There was a syntax issue with the generated SQL. The AI has attempted to fix it automatically.",
      suggestions: ["Try rephrasing your question", "Ask a simpler version of the question"],
    };
  }

  // Generic
  return {
    friendlyMessage: `The query encountered an error: ${error}. Try rephrasing your question or asking something simpler.`,
    suggestions: ["Show all customers", "Show all products", "Show all orders", "What is the monthly sales trend?"],
    availableTables: tableNames,
  };
}

// ============================================================
// KPI Cards Agent
// ============================================================
function kpiCardsAgent(rows: Record<string, unknown>[], question: string): KpiCard[] {
  if (!rows.length) return [];
  const cards: KpiCard[] = [];
  const keys = Object.keys(rows[0]);
  const numericKeys = keys.filter(k => rows.some(r => typeof r[k] === "number" || (typeof r[k] === "string" && !isNaN(parseFloat(String(r[k]))))));

  for (const k of numericKeys.slice(0, 4)) {
    const vals = rows.map(r => parseFloat(String(r[k]))).filter(v => !isNaN(v));
    if (!vals.length) continue;
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    const max = Math.max(...vals);
    const min = Math.min(...vals);

    if (vals.length === 1) {
      cards.push({ label: k, value: vals[0].toLocaleString(), rawValue: vals[0], icon: "metric" });
    } else {
      cards.push({ label: `Total ${k}`, value: sum.toLocaleString(), rawValue: sum, icon: "sum" });
      cards.push({ label: `Avg ${k}`, value: avg.toFixed(2), rawValue: avg, icon: "avg" });
      cards.push({ label: `Max ${k}`, value: max.toLocaleString(), rawValue: max, trend: "up", icon: "max" });
      if (min !== max) cards.push({ label: `Min ${k}`, value: min.toLocaleString(), rawValue: min, trend: "down", icon: "min" });
    }
  }

  // Row count card
  cards.push({ label: "Records", value: String(rows.length), rawValue: rows.length, icon: "count" });

  return cards.slice(0, 6);
}

// ============================================================
// Dashboard Generator Agent
// ============================================================
async function dashboardGeneratorAgent(prompt: string, schema: SchemaInfo): Promise<DashboardConfig> {
  const supa = adminClient();
  const widgets: DashboardWidget[] = [];

  // Determine dashboard type from prompt
  const p = prompt.toLowerCase();

  // Always include core KPIs
  const { data: custCount } = await supa.from("customers").select("*", { count: "exact", head: true });
  const { data: ordCount } = await supa.from("orders").select("*", { count: "exact", head: true });
  const { data: prodCount } = await supa.from("products").select("*", { count: "exact", head: true });
  const { data: compCount } = await supa.from("orders").select("*", { count: "exact", head: true }).eq("status", "completed");

  const { data: revData } = await supa.rpc("run_readonly_query", { p_sql: "SELECT COALESCE(SUM(total_amount),0) AS rev FROM orders WHERE status='completed';" });
  const revRow = Array.isArray(revData) ? revData[0] : revData;
  const revenue = Number(revRow?.rows?.[0]?.rev ?? 0);

  widgets.push({ type: "kpi", title: "Total Revenue", kpi: { label: "Revenue", value: `$${revenue.toLocaleString()}`, rawValue: revenue, icon: "dollar" } });
  widgets.push({ type: "kpi", title: "Customers", kpi: { label: "Customers", value: String(custCount ?? 0), rawValue: custCount ?? 0, icon: "users" } });
  widgets.push({ type: "kpi", title: "Orders", kpi: { label: "Orders", value: String(ordCount ?? 0), rawValue: ordCount ?? 0, icon: "orders" } });
  widgets.push({ type: "kpi", title: "Products", kpi: { label: "Products", value: String(prodCount ?? 0), rawValue: prodCount ?? 0, icon: "products" } });

  // Monthly revenue chart
  const { data: monthlyData } = await supa.rpc("run_readonly_query", { p_sql: "SELECT TO_CHAR(o.order_date, 'YYYY-MM') AS month, ROUND(SUM(o.total_amount)::numeric, 2) AS revenue FROM orders o WHERE o.status = 'completed' GROUP BY month ORDER BY month;" });
  const mRow = Array.isArray(monthlyData) ? monthlyData[0] : monthlyData;
  if (mRow?.rows) {
    widgets.push({ type: "chart", title: "Monthly Revenue", data: mRow.rows as Record<string, unknown>[], chartType: "line", xKey: "month", yKeys: ["revenue"] });
  }

  // Revenue by category
  const { data: catData } = await supa.rpc("run_readonly_query", { p_sql: "SELECT p.category, ROUND(SUM(o.total_amount)::numeric, 2) AS revenue FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id WHERE o.status = 'completed' GROUP BY p.category ORDER BY revenue DESC;" });
  const cRow = Array.isArray(catData) ? catData[0] : catData;
  if (cRow?.rows) {
    widgets.push({ type: "chart", title: "Revenue by Category", data: cRow.rows as Record<string, unknown>[], chartType: "pie", xKey: "category", yKeys: ["revenue"] });
  }

  // Revenue by city
  const { data: cityData } = await supa.rpc("run_readonly_query", { p_sql: "SELECT c.city, ROUND(SUM(o.total_amount)::numeric, 2) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'completed' GROUP BY c.city ORDER BY revenue DESC;" });
  const cityRow = Array.isArray(cityData) ? cityData[0] : cityData;
  if (cityRow?.rows) {
    widgets.push({ type: "chart", title: "Revenue by City", data: cityRow.rows as Record<string, unknown>[], chartType: "bar", xKey: "city", yKeys: ["revenue"] });
  }

  // Orders by status
  const { data: statusData } = await supa.rpc("run_readonly_query", { p_sql: "SELECT status, COUNT(*) AS count FROM orders GROUP BY status ORDER BY count DESC;" });
  const sRow = Array.isArray(statusData) ? statusData[0] : statusData;
  if (sRow?.rows) {
    widgets.push({ type: "chart", title: "Orders by Status", data: sRow.rows as Record<string, unknown>[], chartType: "bar", xKey: "status", yKeys: ["count"] });
  }

  // Top products
  const { data: topProdData } = await supa.rpc("run_readonly_query", { p_sql: "SELECT p.name, p.category, p.price FROM products p ORDER BY p.price DESC LIMIT 5;" });
  const tpRow = Array.isArray(topProdData) ? topProdData[0] : topProdData;
  if (tpRow?.rows) {
    widgets.push({ type: "table", title: "Top Products by Price", data: tpRow.rows as Record<string, unknown>[] });
  }

  const title = /sales/i.test(p) ? "Sales Dashboard" : /customer/i.test(p) ? "Customer Dashboard" : "Analytics Dashboard";

  return { title, widgets, generatedFrom: prompt };
}

// ============================================================
// Explain Schema (AI or heuristic)
// ============================================================
async function explainSchema(schema: SchemaInfo): Promise<{ explanation: string; relationships: string[]; exampleQuestions: string[] }> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (apiKey) {
    try {
      const schemaText = schemaToText(schema);
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are QueryMind. Explain a database schema in beginner-friendly English. Return JSON: {\"explanation\": \"...\", \"relationships\": [...], \"exampleQuestions\": [...]}. No markdown." },
            { role: "user", content: schemaText },
          ],
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        const c = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
        return { explanation: c.explanation ?? "", relationships: c.relationships ?? [], exampleQuestions: c.exampleQuestions ?? [] };
      }
    } catch { /* fall through */ }
  }

  const tableDocs: Record<string, string> = {
    customers: "Stores your customer accounts — their name, email, city, and the date they signed up. Primary key: id.",
    products: "Your product catalog — each product's name, category, and price. Primary key: id.",
    orders: "Each row is one order placed by a customer, with the order date, total amount, and status (completed, pending, shipped, or cancelled). Primary key: id. Links to customers via customer_id.",
    order_items: "The line items inside each order — which product was bought and in what quantity. Links an order to a product. Composite key: (order_id, product_id).",
  };
  const explanation = schema.tables.map(t => tableDocs[t.table_name] ?? `${t.table_name}: ${t.columns.map(c => c.column_name).join(", ")}.`).join("\n\n");
  return {
    explanation,
    relationships: [
      "customers.id ← orders.customer_id (one customer has many orders)",
      "orders.id ← order_items.order_id (one order has many line items)",
      "products.id ← order_items.product_id (one product appears in many line items)",
    ],
    exampleQuestions: ["Top 10 customers by revenue", "Monthly sales trend", "Revenue by category", "Products never ordered", "Customers from New York", "Average order value"],
  };
}

// ============================================================
// Stats dashboard
// ============================================================
async function getStats(): Promise<Record<string, number>> {
  const supa = adminClient();
  const { count: customers } = await supa.from("customers").select("*", { count: "exact", head: true });
  const { count: products } = await supa.from("products").select("*", { count: "exact", head: true });
  const { count: orders } = await supa.from("orders").select("*", { count: "exact", head: true });
  const { count: completed } = await supa.from("orders").select("*", { count: "exact", head: true }).eq("status", "completed");
  const { count: pending } = await supa.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending");
  const { count: cancelled } = await supa.from("orders").select("*", { count: "exact", head: true }).eq("status", "cancelled");

  const { data: revData } = await supa.rpc("run_readonly_query", { p_sql: "SELECT COALESCE(SUM(total_amount),0) AS rev FROM orders WHERE status='completed';" });
  const revRow = Array.isArray(revData) ? revData[0] : revData;
  const revenue = revRow?.rows?.[0]?.rev ?? 0;
  const aov = completed ? Number(revenue) / completed : 0;

  return {
    customers: customers ?? 0, products: products ?? 0, orders: orders ?? 0,
    completed: completed ?? 0, pending: pending ?? 0, cancelled: cancelled ?? 0,
    revenue: Number(revenue), averageOrderValue: isFinite(aov) ? aov : 0,
  };
}

// ============================================================
// AGENT 9: Prediction — forecast future values
// ============================================================
interface Prediction {
  metric: string;
  historical: { label: string; value: number }[];
  forecast: { label: string; value: number; lower: number; upper: number }[];
  confidence: number;
  summary: string;
}

async function predictionAgent(rows: Record<string, unknown>[], question: string): Promise<Prediction | null> {
  if (rows.length < 3) return null;
  const keys = Object.keys(rows[0]);
  const numericKeys = keys.filter(k => {
    const samples = rows.slice(0, 5).map(r => r[k]).filter(v => v !== null && v !== undefined);
    if (!samples.length) return false;
    return samples.every(v => typeof v === "number" || (typeof v === "string" && /^\s*[\d.,$]+\s*$/.test(v) && !isNaN(parseFloat(v))));
  });
  const textKeys = keys.filter(k => typeof rows[0][k] === "string" && !numericKeys.includes(k));

  if (!numericKeys.length || !textKeys.length) return null;

  const xKey = textKeys[0];
  const yKey = numericKeys[0];
  const vals = rows.map(r => ({
    label: String(r[xKey]),
    value: typeof r[yKey] === "number" ? r[yKey] as number : parseFloat(String(r[yKey])) || 0,
  })).filter(v => !isNaN(v.value));

  if (vals.length < 3) return null;

  // Simple linear regression for forecasting
  const n = vals.length;
  const xs = vals.map((_, i) => i);
  const ys = vals.map(v => v.value);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumXX = xs.reduce((a, x) => a + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared for confidence
  const meanY = sumY / n;
  const ssTot = ys.reduce((a, y) => a + (y - meanY) ** 2, 0);
  const ssRes = ys.reduce((a, y, i) => a + (y - (slope * i + intercept)) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
  const confidence = Math.max(0.3, Math.min(0.95, r2));

  // Standard error for confidence intervals
  const stdErr = Math.sqrt(ssRes / Math.max(1, n - 2));
  const margin = stdErr * 1.96;

  // Generate 3 forecast points
  const forecast: { label: string; value: number; lower: number; upper: number }[] = [];
  const lastLabel = vals[vals.length - 1].label;
  for (let i = 1; i <= 3; i++) {
    const predicted = slope * (n - 1 + i) + intercept;
    forecast.push({
      label: `Forecast +${i}`,
      value: Math.max(0, Math.round(predicted * 100) / 100),
      lower: Math.max(0, Math.round((predicted - margin) * 100) / 100),
      upper: Math.round((predicted + margin) * 100) / 100,
    });
  }

  const trend = slope > 0 ? "increasing" : slope < 0 ? "declining" : "stable";
  const summary = `Based on linear regression over ${n} data points, ${yKey} is ${trend} with a projected value of ${forecast[0].value.toLocaleString()} in the next period. Model confidence: ${Math.round(confidence * 100)}% (R²=${r2.toFixed(2)}).`;

  return {
    metric: yKey,
    historical: vals,
    forecast,
    confidence,
    summary,
  };
}

// ============================================================
// AGENT 10: Strategy — recommend business actions
// ============================================================
interface StrategyRecommendation {
  objective: string;
  currentSituation: string;
  recommendations: { action: string; impact: string; priority: "high" | "medium" | "low"; timeline: string }[];
  summary: string;
}

function strategyAgent(rows: Record<string, unknown>[], question: string): StrategyRecommendation {
  const analysis = dataAnalysisAgent(rows, question, { tables: [] } as SchemaInfo);
  const objective = question.length > 80 ? question.slice(0, 77) + "..." : question;

  const recs: { action: string; impact: string; priority: "high" | "medium" | "low"; timeline: string }[] = [];
  for (const r of analysis.recommendations.slice(0, 3)) {
    recs.push({ action: r, impact: "Medium", priority: "medium", timeline: "1-2 weeks" });
  }
  for (const o of analysis.opportunities.slice(0, 2)) {
    recs.push({ action: o, impact: "High", priority: "high", timeline: "2-4 weeks" });
  }
  if (recs.length < 4) {
    recs.push({ action: "Monitor key metrics weekly to track progress", impact: "Low", priority: "low", timeline: "Ongoing" });
  }

  return {
    objective,
    currentSituation: analysis.executiveSummary,
    recommendations: recs.slice(0, 5),
    summary: `Based on the analysis of ${rows.length} records, we recommend ${recs.length} strategic actions. The top priority is: ${recs[0]?.action ?? "monitor metrics"}.`,
  };
}

// ============================================================
// Executive Copilot Dashboard data
// ============================================================
async function getCopilotData(): Promise<{
  greeting: string;
  healthScore: number;
  kpis: KpiCard[];
  alerts: { severity: string; message: string }[];
  predictions: Prediction[];
  riskMeter: { level: string; score: number; factors: string[] };
  opportunityScore: number;
  confidenceScore: number;
  insights: string[];
  recommendedActions: string[];
}> {
  const stats = await getStats();
  const supa = adminClient();

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  // KPIs
  const kpis: KpiCard[] = [
    { label: "Revenue", value: `${stats.revenue.toLocaleString()}`, rawValue: stats.revenue, icon: "dollar", trend: "up" },
    { label: "Orders", value: String(stats.orders), rawValue: stats.orders, icon: "orders" },
    { label: "Customers", value: String(stats.customers), rawValue: stats.customers, icon: "users", trend: "up" },
    { label: "Products", value: String(stats.products), rawValue: stats.products, icon: "products" },
    { label: "Avg Order Value", value: `${stats.averageOrderValue.toFixed(2)}`, rawValue: stats.averageOrderValue, icon: "avg" },
    { label: "Completed", value: String(stats.completed), rawValue: stats.completed, icon: "check", trend: "up" },
    { label: "Pending", value: String(stats.pending), rawValue: stats.pending, icon: "clock" },
    { label: "Cancelled", value: String(stats.cancelled), rawValue: stats.cancelled, icon: "x", trend: stats.cancelled > 0 ? "down" : "flat" },
  ];

  // Alerts
  const alerts: { severity: string; message: string }[] = [];
  const cancelRate = stats.orders > 0 ? (stats.cancelled / stats.orders) * 100 : 0;
  if (cancelRate > 15) alerts.push({ severity: "high", message: `Cancellation rate is ${cancelRate.toFixed(1)}% — above acceptable threshold.` });
  if (stats.pending > stats.completed * 0.3) alerts.push({ severity: "medium", message: `${stats.pending} pending orders need attention.` });
  if (stats.revenue < 1000) alerts.push({ severity: "medium", message: "Revenue is below expected baseline." });
  alerts.push({ severity: "info", message: `${stats.customers} active customers across all cities.` });

  // Monthly revenue for predictions
  const { data: monthlyData } = await supa.rpc("run_readonly_query", { p_sql: "SELECT TO_CHAR(o.order_date, 'YYYY-MM') AS month, ROUND(SUM(o.total_amount)::numeric, 2) AS revenue FROM orders o WHERE o.status = 'completed' GROUP BY month ORDER BY month;" });
  const mRow = Array.isArray(monthlyData) ? monthlyData[0] : monthlyData;
  const monthlyRows = (mRow?.rows ?? []) as Record<string, unknown>[];
  const predictions: Prediction[] = [];
  const revPrediction = await predictionAgent(monthlyRows, "monthly revenue");
  if (revPrediction) predictions.push(revPrediction);

  // Health score (0-100)
  const completionRate = stats.orders > 0 ? stats.completed / stats.orders : 0;
  const healthScore = Math.round((completionRate * 40) + (Math.min(cancelRate / 20, 1) * 20) + (stats.revenue > 1000 ? 20 : 10) + (stats.customers > 10 ? 20 : 10));

  // Risk meter
  const riskScore = Math.round(100 - healthScore);
  const riskLevel = riskScore < 30 ? "Low" : riskScore < 60 ? "Moderate" : "High";
  const riskFactors: string[] = [];
  if (cancelRate > 10) riskFactors.push(`Cancellation rate at ${cancelRate.toFixed(1)}%`);
  if (stats.pending > 3) riskFactors.push(`${stats.pending} pending orders`);
  if (stats.revenue < 2000) riskFactors.push("Revenue below target");

  // Opportunity score
  const opportunityScore = Math.round(Math.min(95, 40 + stats.customers * 2 + stats.products * 1.5 + (stats.completed > 10 ? 20 : 10)));

  // Confidence score
  const confidenceScore = Math.round(70 + completionRate * 20);

  // Insights
  const insights: string[] = [
    `Revenue totals ${stats.revenue.toLocaleString()} from ${stats.completed} completed orders.`,
    `Average order value is ${stats.averageOrderValue.toFixed(2)}.`,
    `${stats.customers} customers across multiple cities.`,
    cancelRate > 10 ? `Cancellation rate of ${cancelRate.toFixed(1)}% needs attention.` : "Cancellation rate is within normal range.",
  ];

  // Recommended actions
  const recommendedActions: string[] = [
    "Review pending orders to improve completion rate",
    "Analyze top-performing customer segments",
    "Investigate cancelled orders for patterns",
    "Forecast Q4 inventory needs based on current trends",
  ];

  return { greeting, healthScore, kpis, alerts, predictions, riskMeter: { level: riskLevel, score: riskScore, factors: riskFactors }, opportunityScore, confidenceScore, insights, recommendedActions };
}

// ============================================================
// Decision Simulator
// ============================================================
interface DecisionSimulation {
  scenario: string;
  assumptions: string[];
  results: { metric: string; currentValue: string; predictedValue: string; change: string; trend: "up" | "down" | "flat" }[];
  risks: string[];
  confidence: number;
  summary: string;
  chartData: { label: string; current: number; projected: number }[];
}

function decisionSimulatorAgent(scenario: string, stats: Record<string, number>): DecisionSimulation {
  const s = scenario.toLowerCase();
  const assumptions: string[] = [];
  const results: { metric: string; currentValue: string; predictedValue: string; change: string; trend: "up" | "down" | "flat" }[] = [];
  const risks: string[] = [];
  const chartData: { label: string; current: number; projected: number }[] = [];

  const revenue = stats.revenue || 4459;
  const orders = stats.orders || 20;
  const aov = stats.averageOrderValue || 343;
  const customers = stats.customers || 20;

  if (/price.*increase|increase.*price|raise.*price/.test(s)) {
    const pct = parseFloat(s.match(/(\d+)\s*%/)?.[1] ?? "10") / 100;
    const newAov = aov * (1 + pct);
    const projectedRevenue = revenue * (1 + pct * 0.7); // 70% pass-through (demand elasticity)
    const projectedOrders = Math.round(orders * (1 - pct * 0.3)); // some demand loss
    assumptions.push(`Average price increases by ${Math.round(pct * 100)}%`, "Demand elasticity assumed at 0.3 (30% of customers are price-sensitive)", "No changes to product mix");
    results.push(
      { metric: "Revenue", currentValue: `${revenue.toLocaleString()}`, predictedValue: `${projectedRevenue.toLocaleString()}`, change: `+${((pct * 70).toFixed(1))}%`, trend: "up" },
      { metric: "Avg Order Value", currentValue: `${aov.toFixed(2)}`, predictedValue: `${newAov.toFixed(2)}`, change: `+${(pct * 100).toFixed(0)}%`, trend: "up" },
      { metric: "Orders", currentValue: String(orders), predictedValue: String(projectedOrders), change: `${(pct * -30).toFixed(1)}%`, trend: "down" },
      { metric: "Customer Impact", currentValue: `${customers} customers`, predictedValue: `${Math.round(customers * (1 - pct * 0.15))} active`, change: `-${(pct * 15).toFixed(0)}% churn`, trend: "down" },
    );
    risks.push("Price-sensitive customers may churn", "Competitors could undercut pricing", "Brand perception may shift");
    chartData.push(
      { label: "Revenue", current: revenue, projected: projectedRevenue },
      { label: "AOV", current: aov, projected: newAov },
      { label: "Orders", current: orders, projected: projectedOrders },
    );
  } else if (/discontinue|remove|stop selling/.test(s)) {
    assumptions.push("One product category is removed from catalog", "20% of affected customers switch to alternatives", "Remaining categories absorb 80% of displaced demand");
    const projectedRevenue = revenue * 0.92;
    const projectedOrders = Math.round(orders * 0.9);
    results.push(
      { metric: "Revenue", currentValue: `${revenue.toLocaleString()}`, predictedValue: `${projectedRevenue.toLocaleString()}`, change: "-8%", trend: "down" },
      { metric: "Orders", currentValue: String(orders), predictedValue: String(projectedOrders), change: "-10%", trend: "down" },
      { metric: "AOV", currentValue: `${aov.toFixed(2)}`, predictedValue: `${(projectedRevenue / projectedOrders).toFixed(2)}`, change: "+2%", trend: "up" },
      { metric: "Customer Impact", currentValue: `${customers} customers`, predictedValue: `${Math.round(customers * 0.95)} retained`, change: "-5% loss", trend: "down" },
    );
    risks.push("Customers loyal to the discontinued product may leave", "Revenue gap may not be fully recovered", "Inventory write-off costs");
    chartData.push(
      { label: "Revenue", current: revenue, projected: projectedRevenue },
      { label: "Orders", current: orders, projected: projectedOrders },
    );
  } else if (/growth.*increase|customer.*growth|increase.*customer/.test(s)) {
    const pct = parseFloat(s.match(/(\d+)\s*%/)?.[1] ?? "20") / 100;
    const newCustomers = Math.round(customers * (1 + pct));
    const projectedOrders = Math.round(orders * (1 + pct * 0.8));
    const projectedRevenue = revenue * (1 + pct * 0.8);
    assumptions.push(`Customer base grows by ${Math.round(pct * 100)}%`, "New customers have similar ordering patterns", "No capacity constraints");
    results.push(
      { metric: "Customers", currentValue: String(customers), predictedValue: String(newCustomers), change: `+${(pct * 100).toFixed(0)}%`, trend: "up" },
      { metric: "Revenue", currentValue: `${revenue.toLocaleString()}`, predictedValue: `${projectedRevenue.toLocaleString()}`, change: `+${(pct * 80).toFixed(0)}%`, trend: "up" },
      { metric: "Orders", currentValue: String(orders), predictedValue: String(projectedOrders), change: `+${(pct * 80).toFixed(0)}%`, trend: "up" },
      { metric: "AOV", currentValue: `${aov.toFixed(2)}`, predictedValue: `${(projectedRevenue / projectedOrders).toFixed(2)}`, change: "~0%", trend: "flat" },
    );
    risks.push("Support capacity may be strained", "Onboarding new customers requires resources", "Quality may dip with rapid growth");
    chartData.push(
      { label: "Customers", current: customers, projected: newCustomers },
      { label: "Revenue", current: revenue, projected: projectedRevenue },
      { label: "Orders", current: orders, projected: projectedOrders },
    );
  } else {
    // Generic scenario
    assumptions.push("Business conditions remain stable", "No major market changes", "Current trends continue");
    const projectedRevenue = revenue * 1.1;
    const projectedOrders = Math.round(orders * 1.08);
    results.push(
      { metric: "Revenue", currentValue: `${revenue.toLocaleString()}`, predictedValue: `${projectedRevenue.toLocaleString()}`, change: "+10%", trend: "up" },
      { metric: "Orders", currentValue: String(orders), predictedValue: String(projectedOrders), change: "+8%", trend: "up" },
      { metric: "AOV", currentValue: `${aov.toFixed(2)}`, predictedValue: `${(projectedRevenue / projectedOrders).toFixed(2)}`, change: "+2%", trend: "up" },
    );
    risks.push("Assumptions may not hold in volatile markets");
    chartData.push(
      { label: "Revenue", current: revenue, projected: projectedRevenue },
      { label: "Orders", current: orders, projected: projectedOrders },
    );
  }

  return {
    scenario,
    assumptions,
    results,
    risks,
    confidence: 0.72,
    summary: `Simulation complete. Based on ${assumptions.length} assumptions, the projected impact shows ${results.filter(r => r.trend === "up").length} metrics improving and ${results.filter(r => r.trend === "down").length} declining.`,
    chartData,
  };
}

// ============================================================
// Mission Mode
// ============================================================
interface Mission {
  goal: string;
  status: string;
  analysis: { currentPerformance: string; problems: string[]; actions: { action: string; impact: string; priority: string }[]; estimatedImpact: string };
  progress: number;
}

async function missionAgent(goal: string): Promise<Mission> {
  const stats = await getStats();
  const supa = adminClient();
  const g = goal.toLowerCase();

  let analysis: Mission["analysis"];
  let progress = 0;

  if (/revenue|sales growth|increase revenue/.test(g)) {
    const { data: catData } = await supa.rpc("run_readonly_query", { p_sql: "SELECT p.category, ROUND(SUM(o.total_amount)::numeric, 2) AS revenue FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id WHERE o.status = 'completed' GROUP BY p.category ORDER BY revenue DESC;" });
    const cRow = Array.isArray(catData) ? catData[0] : catData;
    const catRows = (cRow?.rows ?? []) as Record<string, unknown>[];
    const topCat = catRows[0]?.category ?? "N/A";
    analysis = {
      currentPerformance: `Current revenue is ${stats.revenue.toLocaleString()} from ${stats.completed} completed orders. The top category is ${topCat}.`,
      problems: [
        `${stats.cancelled} cancelled orders represent lost revenue`,
        `${stats.pending} pending orders are not yet converted`,
        "Average order value could be optimized through upselling",
      ],
      actions: [
        { action: "Focus marketing on top-performing categories", impact: "High", priority: "High" },
        { action: "Recover pending orders with targeted follow-up", impact: "Medium", priority: "Medium" },
        { action: "Implement upselling for high-value customers", impact: "Medium", priority: "Medium" },
        { action: "Analyze cancellation reasons and address root causes", impact: "High", priority: "High" },
      ],
      estimatedImpact: `Implementing these actions could increase revenue by 15-25% over the next quarter.`,
    };
    progress = 35;
  } else if (/cost|reduce cost|efficiency/.test(g)) {
    analysis = {
      currentPerformance: `Operating with ${stats.products} products and ${stats.orders} orders. Cancellation rate is ${stats.orders > 0 ? ((stats.cancelled / stats.orders) * 100).toFixed(1) : 0}%.`,
      problems: ["Cancelled orders waste processing resources", "Pending orders tie up inventory", "Some products may have low turnover"],
      actions: [
        { action: "Identify and discontinue low-performing products", impact: "High", priority: "High" },
        { action: "Streamline order processing for pending orders", impact: "Medium", priority: "Medium" },
        { action: "Reduce cancellation rate through better customer communication", impact: "High", priority: "High" },
      ],
      estimatedImpact: `Cost optimization could save 10-18% in operational expenses.`,
    };
    progress = 25;
  } else if (/retention|customer retention|retain/.test(g)) {
    analysis = {
      currentPerformance: `${stats.customers} customers with ${stats.completed} completed orders. Repeat customer rate needs analysis.`,
      problems: ["No visibility into repeat purchase patterns", "Customer churn after cancellations", "Lack of loyalty incentives"],
      actions: [
        { action: "Launch a customer loyalty program", impact: "High", priority: "High" },
        { action: "Personalized outreach to at-risk customers", impact: "Medium", priority: "High" },
        { action: "Offer discounts to customers with cancelled orders", impact: "Medium", priority: "Medium" },
      ],
      estimatedImpact: `Retention improvements could increase customer lifetime value by 20-30%.`,
    };
    progress = 20;
  } else {
    analysis = {
      currentPerformance: `Business operates with ${stats.customers} customers, ${stats.products} products, and ${stats.orders} orders.`,
      problems: ["Need to identify specific improvement areas", "Data analysis required to find bottlenecks"],
      actions: [
        { action: "Analyze current business metrics in detail", impact: "Medium", priority: "High" },
        { action: "Identify top-performing segments", impact: "High", priority: "Medium" },
        { action: "Set measurable KPIs for the goal", impact: "Medium", priority: "High" },
      ],
      estimatedImpact: `A focused strategy could improve overall performance by 15-20%.`,
    };
    progress = 15;
  }

  return { goal, status: "In Progress", analysis, progress };
}

// ============================================================
// Data Detective
// ============================================================
interface DetectiveAlert {
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  recommendation: string;
}

async function dataDetectiveAgent(): Promise<{ alerts: DetectiveAlert[]; summary: string }> {
  const stats = await getStats();
  const supa = adminClient();
  const alerts: DetectiveAlert[] = [];

  // Check for duplicate customers (same name, different email)
  const { data: dupData } = await supa.rpc("run_readonly_query", { p_sql: "SELECT name, COUNT(*) as cnt FROM customers GROUP BY name HAVING COUNT(*) > 1;" });
  const dupRow = Array.isArray(dupData) ? dupData[0] : dupData;
  const dupRows = (dupRow?.rows ?? []) as Record<string, unknown>[];
  if (dupRows.length > 0) {
    alerts.push({ type: "fraud", severity: "warning", title: "Potential Duplicate Customers", description: `${dupRows.length} customer name(s) appear with multiple accounts.`, recommendation: "Review and merge duplicate customer records." });
  } else {
    alerts.push({ type: "fraud", severity: "info", title: "No Duplicate Customers Detected", description: "Customer records appear unique by name.", recommendation: "Continue monitoring for duplicates as the database grows." });
  }

  // Check cancellation spike
  const cancelRate = stats.orders > 0 ? (stats.cancelled / stats.orders) * 100 : 0;
  if (cancelRate > 15) {
    alerts.push({ type: "revenue-drop", severity: "critical", title: "High Cancellation Rate", description: `Cancellation rate is ${cancelRate.toFixed(1)}%, above the 15% threshold.`, recommendation: "Investigate root causes of cancellations immediately." });
  } else if (cancelRate > 5) {
    alerts.push({ type: "revenue-drop", severity: "warning", title: "Elevated Cancellation Rate", description: `Cancellation rate is ${cancelRate.toFixed(1)}%.`, recommendation: "Monitor cancellation trends and identify patterns." });
  }

  // Check revenue concentration
  const { data: topCustData } = await supa.rpc("run_readonly_query", { p_sql: "SELECT c.name, ROUND(SUM(o.total_amount)::numeric, 2) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'completed' GROUP BY c.id, c.name ORDER BY revenue DESC LIMIT 1;" });
  const tcRow = Array.isArray(topCustData) ? topCustData[0] : topCustData;
  const topCustRev = Number(tcRow?.rows?.[0]?.revenue ?? 0);
  if (stats.revenue > 0 && topCustRev / stats.revenue > 0.3) {
    alerts.push({ type: "concentration", severity: "warning", title: "Revenue Concentration Risk", description: `Top customer generates ${(topCustRev / stats.revenue * 100).toFixed(0)}% of revenue.`, recommendation: "Diversify customer base to reduce dependency risk." });
  }

  // Check for seasonal patterns
  const { data: monthlyData } = await supa.rpc("run_readonly_query", { p_sql: "SELECT TO_CHAR(o.order_date, 'YYYY-MM') AS month, COUNT(*) as cnt FROM orders o GROUP BY month ORDER BY month;" });
  const mRow = Array.isArray(monthlyData) ? monthlyData[0] : monthlyData;
  const monthlyRows = (mRow?.rows ?? []) as Record<string, unknown>[];
  if (monthlyRows.length > 0) {
    const counts = monthlyRows.map(r => Number(r.cnt));
    const maxCount = Math.max(...counts);
    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
    if (maxCount > avgCount * 2) {
      alerts.push({ type: "seasonality", severity: "info", title: "Seasonal Sales Spike Detected", description: `Peak month has ${maxCount} orders vs average ${avgCount.toFixed(1)}.`, recommendation: "Prepare inventory and staffing for peak seasons." });
    }
  }

  // Inventory check — products never ordered
  const { data: neverOrderedData } = await supa.rpc("run_readonly_query", { p_sql: "SELECT COUNT(*) as cnt FROM products p WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id);" });
  const noRow = Array.isArray(neverOrderedData) ? neverOrderedData[0] : neverOrderedData;
  const neverOrderedCount = Number(noRow?.rows?.[0]?.cnt ?? 0);
  if (neverOrderedCount > 0) {
    alerts.push({ type: "inventory", severity: "warning", title: "Unsold Products Detected", description: `${neverOrderedCount} product(s) have never been ordered.`, recommendation: "Review pricing, marketing, or consider discontinuing these products." });
  }

  // Suspicious transactions — very high value orders
  const { data: highValData } = await supa.rpc("run_readonly_query", { p_sql: "SELECT o.id, o.total_amount, c.name FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.total_amount > 1000 ORDER BY o.total_amount DESC;" });
  const hvRow = Array.isArray(highValData) ? highValData[0] : highValData;
  const highValRows = (hvRow?.rows ?? []) as Record<string, unknown>[];
  if (highValRows.length > 0) {
    alerts.push({ type: "suspicious", severity: "info", title: "High-Value Transactions", description: `${highValRows.length} order(s) exceed $1,000. Largest: ${Number(highValRows[0]?.total_amount ?? 0).toLocaleString()}.`, recommendation: "Verify high-value orders for legitimacy." });
  }

  const summary = `Data Detective analyzed the database and found ${alerts.filter(a => a.severity === "critical").length} critical alert(s), ${alerts.filter(a => a.severity === "warning").length} warning(s), and ${alerts.filter(a => a.severity === "info").length} informational alert(s).`;

  return { alerts, summary };
}

// ============================================================
// Meeting Mode
// ============================================================
interface MeetingReport {
  agenda: string[];
  executiveSummary: string;
  talkingPoints: string[];
  keyKpis: { label: string; value: string }[];
  concerns: string[];
  recommendations: string[];
}

async function meetingAgent(): Promise<MeetingReport> {
  const stats = await getStats();
  const cancelRate = stats.orders > 0 ? (stats.cancelled / stats.orders) * 100 : 0;

  return {
    agenda: [
      "1. Revenue and order performance review",
      "2. Customer growth and retention",
      "3. Cancellation analysis and mitigation",
      "4. Product performance highlights",
      "5. Strategic recommendations and next steps",
    ],
    executiveSummary: `Business generated ${stats.revenue.toLocaleString()} in revenue from ${stats.completed} completed orders. ${stats.customers} customers are active across all cities. The average order value is ${stats.averageOrderValue.toFixed(2)}. ${stats.pending} orders are pending and ${stats.cancelled} were cancelled (${cancelRate.toFixed(1)}% rate).`,
    talkingPoints: [
      `Revenue of ${stats.revenue.toLocaleString()} reflects ${stats.completed} completed transactions`,
      `Average order value of ${stats.averageOrderValue.toFixed(2)} indicates healthy spending per customer`,
      `${stats.pending} pending orders require immediate follow-up`,
      `Cancellation rate at ${cancelRate.toFixed(1)}% ${cancelRate > 10 ? "needs attention" : "is within normal range"}`,
      `${stats.customers} active customers provide a solid base for growth`,
    ],
    keyKpis: [
      { label: "Total Revenue", value: `${stats.revenue.toLocaleString()}` },
      { label: "Total Orders", value: String(stats.orders) },
      { label: "Completed Orders", value: String(stats.completed) },
      { label: "Pending Orders", value: String(stats.pending) },
      { label: "Cancelled Orders", value: String(stats.cancelled) },
      { label: "Avg Order Value", value: `${stats.averageOrderValue.toFixed(2)}` },
      { label: "Total Customers", value: String(stats.customers) },
      { label: "Total Products", value: String(stats.products) },
    ],
    concerns: [
      cancelRate > 10 ? `Cancellation rate of ${cancelRate.toFixed(1)}% exceeds acceptable threshold` : "Monitor cancellation trends",
      stats.pending > 3 ? `${stats.pending} pending orders need resolution` : "Order pipeline is healthy",
      "Revenue concentration in top customers needs diversification",
    ],
    recommendations: [
      "Prioritize converting pending orders to completed",
      "Investigate root causes of cancellations",
      "Develop customer retention initiatives",
      "Expand product offerings in top-performing categories",
    ],
  };
}

// ============================================================
// Presentation Generator
// ============================================================
interface PresentationSlide {
  title: string;
  content: string;
  bullets: string[];
  chartType?: string;
}

async function presentationAgent(): Promise<{ title: string; slides: PresentationSlide[]; speakerNotes: string[] }> {
  const stats = await getStats();
  const cancelRate = stats.orders > 0 ? (stats.cancelled / stats.orders) * 100 : 0;

  return {
    title: "Business Performance Review",
    slides: [
      {
        title: "Executive Overview",
        content: `Current business performance snapshot showing ${stats.revenue.toLocaleString()} in revenue.`,
        bullets: [
          `${stats.revenue.toLocaleString()} total revenue`,
          `${stats.completed} completed orders`,
          `${stats.customers} active customers`,
          `${stats.products} products in catalog`,
        ],
      },
      {
        title: "Revenue Performance",
        content: "Revenue breakdown and trend analysis.",
        bullets: [
          `Average order value: ${stats.averageOrderValue.toFixed(2)}`,
          `Completion rate: ${((stats.completed / Math.max(1, stats.orders)) * 100).toFixed(1)}%`,
          `Revenue per customer: ${(stats.revenue / Math.max(1, stats.customers)).toFixed(2)}`,
        ],
        chartType: "bar",
      },
      {
        title: "Order Status Breakdown",
        content: "Distribution of orders by status.",
        bullets: [
          `${stats.completed} completed (${((stats.completed / Math.max(1, stats.orders)) * 100).toFixed(0)}%)`,
          `${stats.pending} pending (${((stats.pending / Math.max(1, stats.orders)) * 100).toFixed(0)}%)`,
          `${stats.cancelled} cancelled (${cancelRate.toFixed(1)}%)`,
        ],
        chartType: "pie",
      },
      {
        title: "Key Insights & Risks",
        content: "Critical findings from AI analysis.",
        bullets: [
          cancelRate > 10 ? `Cancellation rate of ${cancelRate.toFixed(1)}% is elevated` : "Cancellation rate is normal",
          `${stats.pending} pending orders need follow-up`,
          "Revenue concentration risk in top customers",
          "Opportunity to expand product categories",
        ],
      },
      {
        title: "Strategic Recommendations",
        content: "AI-driven recommendations for next quarter.",
        bullets: [
          "Convert pending orders through targeted outreach",
          "Reduce cancellations by addressing root causes",
          "Diversify customer base to reduce concentration risk",
          "Optimize inventory based on product performance",
        ],
      },
    ],
    speakerNotes: [
      "Start with the high-level revenue number and set the context for the meeting.",
      "Walk through the revenue metrics, highlighting the average order value and completion rate.",
      "Show the order status breakdown and discuss any concerning patterns.",
      "Present the key insights — be prepared to discuss cancellation reasons.",
      "End with clear action items and owners for each recommendation.",
    ],
  };
}

// ============================================================
// Main handler — Multi-Agent Orchestration
// ============================================================
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/querymind/, "").replace(/^\/+/, "");

  try {
    // ---- /health ----
    if (path === "health" || path === "health/") {
      const start = performance.now();
      try {
        const supa = adminClient();
        const { error } = await supa.rpc("get_schema_info");
        const latency = Math.round(performance.now() - start);
        if (error) {
          return new Response(JSON.stringify({ status: "disconnected", latency, error: error.message }), {
            status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ status: "connected", latency, timestamp: new Date().toISOString() }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (healthErr) {
        const latency = Math.round(performance.now() - start);
        return new Response(JSON.stringify({ status: "disconnected", latency, error: String(healthErr) }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ---- /schema ----
    if (path === "schema" || path === "schema/") {
      const schema = await readSchema();
      return new Response(JSON.stringify(schema), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- /explain-schema ----
    if (path === "explain-schema" || path === "explain-schema/") {
      const schema = await readSchema();
      const result = await explainSchema(schema);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- /stats ----
    if (path === "stats" || path === "stats/") {
      const stats = await getStats();
      return new Response(JSON.stringify(stats), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- /dashboard ----
    if (path === "dashboard" || path === "dashboard/") {
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const body = await req.json() as { prompt: string };
      const schema = await readSchema();
      const dashboard = await dashboardGeneratorAgent(body.prompt ?? "Sales Dashboard", schema);
      return new Response(JSON.stringify(dashboard), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- /copilot ----
    if (path === "copilot" || path === "copilot/") {
      const data = await getCopilotData();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- /decision-simulator ----
    if (path === "decision-simulator" || path === "decision-simulator/") {
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const body = await req.json() as { scenario: string };
      const stats = await getStats();
      const simulation = decisionSimulatorAgent(body.scenario ?? "What if revenue increases by 10%?", stats);
      return new Response(JSON.stringify(simulation), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- /mission ----
    if (path === "mission" || path === "mission/") {
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const body = await req.json() as { goal: string };
      const mission = await missionAgent(body.goal ?? "Increase Revenue");
      return new Response(JSON.stringify(mission), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- /data-detective ----
    if (path === "data-detective" || path === "data-detective/") {
      const result = await dataDetectiveAgent();
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- /meeting ----
    if (path === "meeting" || path === "meeting/") {
      const report = await meetingAgent();
      return new Response(JSON.stringify(report), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- /presentation ----
    if (path === "presentation" || path === "presentation/") {
      const presentation = await presentationAgent();
      return new Response(JSON.stringify(presentation), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- /chat (Multi-Agent Pipeline) ----
    if (path === "chat" || path === "chat/") {
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const body = await req.json() as ChatBody;
      const question = (body.question ?? "").trim();
      if (!question) {
        return new Response(JSON.stringify({ error: "Question is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const history = body.history ?? [];
      const schema = await readSchema();

      // Initialize agent trace
      const trace: AgentStep[] = [
        { agent: "planner", label: "Planner", status: "pending" },
        { agent: "sql-gen", label: "SQL Engineer", status: "pending" },
        { agent: "security", label: "Security", status: "pending" },
        { agent: "repair", label: "SQL Repair", status: "pending" },
        { agent: "viz", label: "Visualization", status: "pending" },
        { agent: "insight", label: "Business Analyst", status: "pending" },
        { agent: "prediction", label: "Prediction", status: "pending" },
        { agent: "strategy", label: "Strategy", status: "pending" },
        { agent: "follow-up", label: "Follow-up", status: "pending" },
      ];

      // --- Agent 1: Planner ---
      trace[0].status = "active";
      const plan = plannerAgent(question, history);
      trace[0].status = "done";
      trace[0].detail = plan.intent;

      // --- Agent 2: SQL Generator ---
      trace[1].status = "active";
      let gen: { sql: string; explanation: string; confidence: number };
      let usedOpenAI = false;
      try {
        gen = await openAiGenerate(plan.rewritten, history, schema);
        usedOpenAI = true;
      } catch {
        gen = heuristicGenerate(plan.rewritten, history, schema);
      }
      trace[1].status = "done";

      if (!gen.sql) {
        return new Response(JSON.stringify({
          sql: "", explanation: "I couldn't generate a query for that question.", confidence: 0,
          rows: [], rowCount: 0, executionMs: 0, error: "generation-failed",
          insights: [], suggestions: followUpAgent(question, []),
          agentTrace: trace.map((t, i) => i > 1 ? { ...t, status: "skipped" } : t),
        } as ChatResult), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // --- Agent 3: Security ---
      trace[2].status = "active";
      const validation = validateReadOnly(gen.sql);
      if (!validation.ok) {
        trace[2].status = "done";
        trace[2].detail = validation.reason;
        const result: ChatResult = {
          sql: gen.sql, explanation: gen.explanation, confidence: gen.confidence,
          rows: [], rowCount: 0, executionMs: 0,
          blocked: true, blockedReason: validation.reason,
          insights: [], suggestions: followUpAgent(question, []),
          agentTrace: trace.map((t, i) => i > 2 ? { ...t, status: "skipped" } : t),
        };
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      trace[2].status = "done";

      // --- Execute ---
      let exec = await executeQuery(gen.sql);

      // --- Agent 4: SQL Repair (if execution failed) ---
      if (exec.error) {
        trace[3].status = "active";
        trace[3].detail = exec.error;
        const repaired = await sqlRepairAgent(gen.sql, exec.error, question, schema, usedOpenAI);
        if (repaired && repaired.sql !== gen.sql) {
          const repValidation = validateReadOnly(repaired.sql);
          if (repValidation.ok) {
            const repExec = await executeQuery(repaired.sql);
            if (!repExec.error) {
              trace[3].status = "done";
              trace[3].detail = "SQL auto-corrected";
              exec = repExec;
              gen = { ...repaired, explanation: repaired.explanation };
              gen = { ...gen, sql: repaired.sql };
              // Mark corrected
              const rows = exec.rows;
              const confBreak = confidenceBreakdownAgent(repaired.sql, question, schema, repaired.confidence);
              const viz = visualizationAgent(rows);
              const result: ChatResult = {
                sql: repaired.sql, explanation: repaired.explanation, confidence: repaired.confidence,
                confidenceBreakdown: confBreak,
                corrected: true, originalSql: gen.sql,
                rows, rowCount: exec.rowCount, executionMs: exec.executionMs,
                costEstimate: estimateCost(repaired.sql, exec.rowCount),
                insights: insightAgent(rows, question),
                suggestions: followUpAgent(question, rows),
                analysis: dataAnalysisAgent(rows, question, schema),
                narrative: storytellingAgent(rows, question),
                sqlTeacher: sqlTeacherAgent(repaired.sql),
                agentTrace: trace.map((t, i) => i > 3 && i < 5 ? { ...t, status: "pending" } : t),
                chartType: viz.chartType, chartXKey: viz.xKey, chartYKeys: viz.yKeys,
                kpis: kpiCardsAgent(rows, question),
              };
              // Fill remaining agents
              trace[4].status = "done"; trace[5].status = "done"; trace[6].status = "done";
              result.agentTrace = trace;
              return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
          }
        }
        trace[3].status = "done";
        trace[3].detail = "Repair attempted";
      } else {
        trace[3].status = "skipped";
        trace[3].detail = "No repair needed";
      }

      if (exec.error) {
        const recovery = errorRecoveryAgent(exec.error, gen.sql, question, schema);
        const result: ChatResult = {
          sql: gen.sql, explanation: gen.explanation, confidence: gen.confidence,
          rows: [], rowCount: 0, executionMs: 0, error: exec.error,
          errorRecovery: recovery,
          insights: [], suggestions: recovery.suggestions.slice(0, 4),
          agentTrace: trace.map((t, i) => i > 3 ? { ...t, status: "skipped" } : t),
        };
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // --- Agent 5: Visualization ---
      trace[4].status = "active";
      const viz = visualizationAgent(exec.rows);
      trace[4].status = "done";

      // --- Agent 6: Business Analyst ---
      trace[5].status = "active";
      const analysis = dataAnalysisAgent(exec.rows, question, schema);
      const narrative = storytellingAgent(exec.rows, question);
      const insights = insightAgent(exec.rows, question);
      trace[5].status = "done";

      // --- Agent 7: Prediction ---
      trace[6].status = "active";
      let prediction: Prediction | null = null;
      try {
        prediction = await predictionAgent(exec.rows, question);
      } catch (predErr) {
        trace[6].detail = "Prediction error: " + (predErr instanceof Error ? predErr.message : String(predErr));
      }
      trace[6].status = prediction ? "done" : "skipped";
      trace[6].detail = prediction ? "Forecast generated" : (trace[6].detail ?? "Insufficient data for forecasting");

      // --- Agent 8: Strategy ---
      trace[7].status = "active";
      const strategy = strategyAgent(exec.rows, question);
      trace[7].status = "done";

      // --- Agent 9: Follow-up ---
      trace[8].status = "active";
      const suggestions = followUpAgent(question, exec.rows);
      trace[8].status = "done";

      // --- Confidence breakdown ---
      const confBreak = confidenceBreakdownAgent(gen.sql, question, schema, gen.confidence);

      // --- SQL Teacher ---
      const teacher = sqlTeacherAgent(gen.sql);

      // --- KPI cards ---
      const kpis = kpiCardsAgent(exec.rows, question);

      const rows = exec.rows;
      const result: ChatResult = {
        sql: gen.sql, explanation: gen.explanation, confidence: gen.confidence,
        confidenceBreakdown: confBreak,
        rows, rowCount: exec.rowCount, executionMs: exec.executionMs,
        costEstimate: estimateCost(gen.sql, exec.rowCount),
        insights, suggestions,
        analysis, narrative, sqlTeacher: teacher,
        agentTrace: trace,
        chartType: viz.chartType, chartXKey: viz.xKey, chartYKeys: viz.yKeys,
        kpis,
        prediction: prediction ?? undefined,
        strategy: strategy,
      };
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message ?? "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
