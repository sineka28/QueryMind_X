import { motion } from "framer-motion";
import { Sparkles, Table2, Link2, Calculator } from "lucide-react";
import type { ChatResult } from "@/lib/types";

export function ExplanationPanel({ result }: { result: ChatResult }) {
  const tables = extractTables(result.sql);
  const joins = extractJoins(result.sql);
  const hasAgg = /\b(sum|avg|count|min|max|group by)\b/i.test(result.sql);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20">
          <Sparkles className="h-4 w-4 text-violet-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">AI Explanation</h3>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed mb-3">{result.explanation}</p>

      <div className="flex flex-wrap gap-2">
        {tables.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 px-2.5 py-1.5">
            <Table2 className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-xs text-slate-300">{tables.join(", ")}</span>
          </div>
        )}
        {joins.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5">
            <Link2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-slate-300">{joins.length} join{joins.length > 1 ? "s" : ""}</span>
          </div>
        )}
        {hasAgg && (
          <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5">
            <Calculator className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs text-slate-300">Aggregation</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function extractTables(sql: string): string[] {
  const matches = sql.match(/(?:from|join)\s+([a-z_][a-z0-9_]*)/gi) ?? [];
  return [...new Set(matches.map((m) => m.split(/\s+/)[1]).filter(Boolean))].slice(0, 4);
}

function extractJoins(sql: string): string[] {
  return sql.match(/join\s+[a-z_][a-z0-9_]*\s+[^;]+on\s+[^;]+/gi) ?? [];
}
