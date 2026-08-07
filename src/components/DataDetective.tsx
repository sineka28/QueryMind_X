import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Loader2, X, Search, AlertTriangle, Info, ShieldCheck } from "lucide-react";
import { runDataDetective } from "@/lib/api";
import type { DetectiveResult, DetectiveAlert } from "@/lib/types";

export function DataDetective({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<DetectiveResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runDataDetective()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const severityConfig = {
    critical: { icon: AlertTriangle, color: "text-rose-400 bg-rose-500/10 border-rose-500/20", label: "Critical" },
    warning: { icon: ShieldAlert, color: "text-amber-400 bg-amber-500/10 border-amber-500/20", label: "Warning" },
    info: { icon: Info, color: "text-sky-400 bg-sky-500/10 border-sky-500/20", label: "Info" },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-full max-w-2xl max-h-[88vh] overflow-y-auto scrollbar-thin"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 sticky top-0 bg-slate-900/80 backdrop-blur-xl z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
              <Search className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold gradient-text">AI Data Detective</h2>
              <p className="text-xs text-slate-500">Continuous data quality and fraud monitoring</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-amber-400 animate-spin" />
              <span className="ml-2 text-sm text-slate-400">Investigating database...</span>
            </div>
          ) : data ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
                <p className="text-sm text-slate-300">{data.summary}</p>
              </div>

              <div className="space-y-2.5">
                {data.alerts.map((alert: DetectiveAlert, i) => {
                  const cfg = severityConfig[alert.severity];
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={`rounded-lg border px-4 py-3 ${cfg.color}`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase">{cfg.label}</span>
                        <span className="text-xs text-slate-500 ml-auto">{alert.type}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-200 mb-1">{alert.title}</p>
                      <p className="text-xs text-slate-400 leading-relaxed mb-2">{alert.description}</p>
                      <div className="flex items-start gap-1.5 pt-1.5 border-t border-white/5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-slate-400">{alert.recommendation}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}
