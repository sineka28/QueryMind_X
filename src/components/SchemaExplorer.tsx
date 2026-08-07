import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, KeyRound, Link2, Table2, X, Loader2, ChevronDown, ChevronUp, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { fetchSchema, explainSchema } from "@/lib/api";
import type { SchemaInfo, SchemaExplanation, TableInfo } from "@/lib/types";

const TABLE_COLORS: Record<string, string> = {
  customers: "from-sky-500/20 to-blue-600/20 border-sky-500/30",
  orders: "from-violet-500/20 to-purple-600/20 border-violet-500/30",
  products: "from-emerald-500/20 to-teal-600/20 border-emerald-500/30",
  order_items: "from-amber-500/20 to-orange-600/20 border-amber-500/30",
};

const TABLE_POSITIONS: Record<string, { x: number; y: number }> = {
  customers: { x: 40, y: 60 },
  orders: { x: 320, y: 60 },
  order_items: { x: 600, y: 60 },
  products: { x: 600, y: 300 },
};

export function SchemaExplorer({ onClose }: { onClose: () => void }) {
  const [schema, setSchema] = useState<SchemaInfo | null>(null);
  const [explanation, setExplanation] = useState<SchemaExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    Promise.all([fetchSchema(), explainSchema()])
      .then(([s, e]) => { setSchema(s); setExplanation(e); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-full max-w-5xl max-h-[88vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold gradient-text">Schema Explorer</h2>
              <p className="text-xs text-slate-500">Interactive ER Diagram</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-1">
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1.5 text-slate-400 hover:text-slate-200" aria-label="Zoom out">
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-xs text-slate-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 text-slate-400 hover:text-slate-200" aria-label="Zoom in">
                <ZoomIn className="h-4 w-4" />
              </button>
              <button onClick={() => setZoom(1)} className="p-1.5 text-slate-400 hover:text-slate-200" aria-label="Reset zoom">
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 text-sky-400 animate-spin" />
            <span className="ml-2 text-sm text-slate-400">Loading schema...</span>
          </div>
        ) : schema ? (
          <div className="flex-1 overflow-auto scrollbar-thin">
            {/* ER Diagram */}
            <div className="relative p-6" style={{ minWidth: 800 * zoom, minHeight: 500 * zoom }}>
              <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
                {/* Connection lines */}
                <svg className="absolute inset-0 pointer-events-none" style={{ width: 800, height: 500 }}>
                  {/* customers -> orders */}
                  <line x1={200} y1={120} x2={320} y2={120} stroke="rgba(56,189,248,0.3)" strokeWidth="2" strokeDasharray="4 4" />
                  <text x={250} y={112} fill="rgba(148,163,184,0.6)" fontSize="10" textAnchor="middle">1:N</text>
                  {/* orders -> order_items */}
                  <line x1={480} y1={120} x2={600} y2={120} stroke="rgba(139,92,246,0.3)" strokeWidth="2" strokeDasharray="4 4" />
                  <text x={530} y={112} fill="rgba(148,163,184,0.6)" fontSize="10" textAnchor="middle">1:N</text>
                  {/* products -> order_items */}
                  <line x1={700} y1={300} x2={700} y2={200} stroke="rgba(52,211,153,0.3)" strokeWidth="2" strokeDasharray="4 4" />
                  <text x={720} y={250} fill="rgba(148,163,184,0.6)" fontSize="10">1:N</text>
                </svg>

                {/* Table nodes */}
                {schema.tables.map((table) => (
                  <TableNode
                    key={table.table_name}
                    table={table}
                    expanded={expandedTable === table.table_name}
                    onToggle={() => setExpandedTable(expandedTable === table.table_name ? null : table.table_name)}
                  />
                ))}
              </div>
            </div>

            {/* Relationships + AI explanation */}
            {explanation && (
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-200 mb-2">
                    <Link2 className="h-4 w-4 text-emerald-400" /> Relationships
                  </h3>
                  <div className="space-y-1.5">
                    {explanation.relationships.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-2">
                        <KeyRound className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs text-slate-300 font-mono">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-200 mb-2">
                    <Database className="h-4 w-4 text-sky-400" /> AI Schema Explanation
                  </h3>
                  <div className="space-y-2">
                    {explanation.explanation.split("\n\n").filter(Boolean).map((p, i) => (
                      <div key={i} className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2.5">
                        <p className="text-sm text-slate-300 leading-relaxed">{p}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-200 mb-2">
                    <Table2 className="h-4 w-4 text-amber-400" /> Example Questions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {explanation.exampleQuestions.map((q, i) => (
                      <span key={i} className="rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-slate-300">{q}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

function TableNode({ table, expanded, onToggle }: { table: TableInfo; expanded: boolean; onToggle: () => void }) {
  const pos = TABLE_POSITIONS[table.table_name] ?? { x: 40, y: 60 };
  const colorClass = TABLE_COLORS[table.table_name] ?? "from-slate-500/20 to-slate-600/20 border-slate-500/30";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      className={`absolute rounded-xl bg-gradient-to-br ${colorClass} border backdrop-blur-xl shadow-xl overflow-hidden`}
      style={{ left: pos.x, top: pos.y, width: 180 }}
    >
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-1.5">
          <Table2 className="h-3.5 w-3.5 text-slate-300" />
          <span className="text-xs font-semibold text-slate-200">{table.table_name}</span>
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="p-2 space-y-1">
              {table.columns.map((col) => {
                const isPK = table.primary_keys?.includes(col.column_name);
                const isFK = table.foreign_keys?.find(fk => fk.column_name === col.column_name);
                return (
                  <div key={col.column_name} className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-white/5">
                    {isPK ? (
                      <KeyRound className="h-3 w-3 text-amber-400 shrink-0" />
                    ) : isFK ? (
                      <Link2 className="h-3 w-3 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="w-3 shrink-0" />
                    )}
                    <span className="text-[11px] text-slate-300 font-mono flex-1 truncate">{col.column_name}</span>
                    <span className="text-[9px] text-slate-500">{col.data_type}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
