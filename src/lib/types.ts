export interface ColumnInfo {
  column_name: string;
  data_type: string;
}

export interface ForeignKeyInfo {
  column_name: string;
  references_table: string;
  references_column: string;
}

export interface TableInfo {
  table_name: string;
  columns: ColumnInfo[];
  primary_keys?: string[];
  foreign_keys?: ForeignKeyInfo[];
}

export interface SchemaInfo {
  tables: TableInfo[];
}

// Multi-agent trace
export interface AgentStep {
  agent: string;
  label: string;
  status: "pending" | "active" | "done" | "skipped";
  detail?: string;
}

// Confidence breakdown
export interface ConfidenceBreakdown {
  schemaMatch: number;
  columnMatch: number;
  joinConfidence: number;
  aggregationConfidence: number;
  overall: number;
  reasoning: string[];
}

// SQL teacher — clause-by-clause educational explanation
export interface SqlClauseExplanation {
  clause: string;
  keyword: string;
  explanation: string;
}

export interface SqlTeacher {
  purpose: string;
  clauses: SqlClauseExplanation[];
  concepts: string[];
}

// AI Data Analyst — deep analysis from returned rows
export interface DataAnalysis {
  executiveSummary: string;
  keyFindings: string[];
  trends: string[];
  anomalies: string[];
  businessImpact: string;
  recommendations: string[];
  risks: string[];
  opportunities: string[];
  nextBestActions: string[];
}

// AI Storytelling — narrative over the data
export interface Narrative {
  title: string;
  story: string;
  highlights: string[];
}

// Smart error recovery
export interface ErrorRecovery {
  friendlyMessage: string;
  suggestions: string[];
  suggestedQuestion?: string;
  availableTables?: string[];
  availableColumns?: string[];
}

// KPI card for dashboard / insight engine
export interface KpiCard {
  label: string;
  value: string;
  rawValue: number;
  change?: string;
  trend?: "up" | "down" | "flat";
  icon?: string;
}

// Dashboard config
export interface DashboardWidget {
  type: "kpi" | "chart" | "table";
  title: string;
  data?: Record<string, unknown>[];
  kpi?: KpiCard;
  chartType?: "bar" | "line" | "area" | "pie";
  xKey?: string;
  yKeys?: string[];
}

export interface DashboardConfig {
  title: string;
  widgets: DashboardWidget[];
  generatedFrom: string;
}

// Extended ChatResult
export interface ChatResult {
  sql: string;
  explanation: string;
  confidence: number;
  confidenceBreakdown?: ConfidenceBreakdown;
  corrected?: boolean;
  originalSql?: string;
  rows: Record<string, unknown>[];
  rowCount: number;
  executionMs: number;
  costEstimate?: string;
  blocked?: boolean;
  blockedReason?: string;
  error?: string;
  errorRecovery?: ErrorRecovery;
  insights: string[];
  suggestions: string[];
  analysis?: DataAnalysis;
  narrative?: Narrative;
  sqlTeacher?: SqlTeacher;
  agentTrace?: AgentStep[];
  chartType?: string;
  chartXKey?: string;
  chartYKeys?: string[];
  kpis?: KpiCard[];
  prediction?: Prediction;
  strategy?: StrategyRecommendation;
}

// Prediction
export interface Prediction {
  metric: string;
  historical: { label: string; value: number }[];
  forecast: { label: string; value: number; lower: number; upper: number }[];
  confidence: number;
  summary: string;
}

// Strategy
export interface StrategyRecommendation {
  objective: string;
  currentSituation: string;
  recommendations: { action: string; impact: string; priority: "high" | "medium" | "low"; timeline: string }[];
  summary: string;
}

// Executive Copilot
export interface CopilotData {
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
}

// Decision Simulation
export interface DecisionSimulation {
  scenario: string;
  assumptions: string[];
  results: { metric: string; currentValue: string; predictedValue: string; change: string; trend: "up" | "down" | "flat" }[];
  risks: string[];
  confidence: number;
  summary: string;
  chartData: { label: string; current: number; projected: number }[];
}

// Mission
export interface Mission {
  goal: string;
  status: string;
  analysis: {
    currentPerformance: string;
    problems: string[];
    actions: { action: string; impact: string; priority: string }[];
    estimatedImpact: string;
  };
  progress: number;
}

// Data Detective
export interface DetectiveAlert {
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  recommendation: string;
}

export interface DetectiveResult {
  alerts: DetectiveAlert[];
  summary: string;
}

// Meeting
export interface MeetingReport {
  agenda: string[];
  executiveSummary: string;
  talkingPoints: string[];
  keyKpis: { label: string; value: string }[];
  concerns: string[];
  recommendations: string[];
}

// Presentation
export interface PresentationSlide {
  title: string;
  content: string;
  bullets: string[];
  chartType?: string;
}

export interface Presentation {
  title: string;
  slides: PresentationSlide[];
  speakerNotes: string[];
}

export interface SchemaExplanation {
  explanation: string;
  relationships: string[];
  exampleQuestions: string[];
}

export interface Stats {
  customers: number;
  products: number;
  orders: number;
  completed: number;
  pending: number;
  cancelled: number;
  revenue: number;
  averageOrderValue: number;
}

export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  result?: ChatResult;
  timestamp: number;
  loading?: boolean;
  loadingStage?: number;
  error?: string;
}

export interface HistoryItem {
  id: string;
  question: string;
  timestamp: number;
  favorite: boolean;
  tag?: string;
}

export interface SavedDashboard {
  id: string;
  title: string;
  config: DashboardConfig;
  createdAt: number;
}
