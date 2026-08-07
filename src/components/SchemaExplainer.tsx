import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Database, Link2, KeyRound, Lightbulb, X, Loader2 } from "lucide-react";
import { explainSchema } from "@/lib/api";
import type { SchemaExplanation } from "@/lib/types";

export function SchemaExplainer({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<SchemaExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    explainSchema()
      .then(setData)
      .catch((e) => setError(e.message))
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
        className="glass-card w-full max-w-3xl max-h-[85vh] overflow-y-auto scrollbar-thin p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
              <Database className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold gradient-text">Explain My Schema</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-sky-400 animate-spin" />
            <span className="ml-2 text-sm text-slate-400">Analyzing schema...</span>
          </div>
        ) : error ? (
          <p className="text-sm text-rose-400">{error}</p>
        ) : data ? (
          <div className="space-y-5">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-200 mb-2">
                <Database className="h-4 w-4 text-sky-400" /> Tables & Purpose
              </h3>
              <div className="space-y-2">
                {data.explanation.split("\n\n").filter(Boolean).map((p, i) => (
                  <div key={i} className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2.5">
                    <p className="text-sm text-slate-300 leading-relaxed">{p}</p>
                  </div>
                ))}
              </div>
            </div>

            {data.relationships.length > 0 && (
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-200 mb-2">
                  <Link2 className="h-4 w-4 text-emerald-400" /> Relationships
                </h3>
                <div className="space-y-1.5">
                  {data.relationships.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-2">
                      <KeyRound className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="text-xs text-slate-300 font-mono">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.exampleQuestions.length > 0 && (
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-200 mb-2">
                  <Lightbulb className="h-4 w-4 text-amber-400" /> Example Questions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.exampleQuestions.map((q, i) => (
                    <span key={i} className="rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-slate-300">
                      {q}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
