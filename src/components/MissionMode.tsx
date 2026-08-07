import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Target, Loader2, X, CheckCircle2, AlertCircle, TrendingUp, ArrowRight } from "lucide-react";
import { startMission } from "@/lib/api";
import type { Mission } from "@/lib/types";

const MISSIONS = [
  "Increase Revenue",
  "Reduce Costs",
  "Improve Customer Retention",
  "Reduce Refunds",
  "Increase Sales",
  "Optimize Inventory",
  "Launch New Product",
];

export function MissionMode({ onClose, onAsk }: { onClose: () => void; onAsk: (q: string) => void }) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState("");

  const run = (goal: string) => {
    setLoading(true);
    setMission(null);
    setSelectedGoal(goal);
    startMission(goal)
      .then(setMission)
      .catch(() => {})
      .finally(() => setLoading(false));
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold gradient-text">AI Business Mission Mode</h2>
              <p className="text-xs text-slate-500">Set a goal and let AI build a strategy</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mission selection */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">Select a Business Goal</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MISSIONS.map((m, i) => (
                <motion.button
                  key={i}
                  whileHover={{ y: -2 }}
                  onClick={() => run(m)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                    selectedGoal === m
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : "bg-white/5 border-white/10 text-slate-300 hover:text-slate-100"
                  }`}
                >
                  <Target className="h-4 w-4" />
                  {m}
                </motion.button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
              <span className="ml-2 text-sm text-slate-400">Analyzing business and building strategy...</span>
            </div>
          )}

          {mission && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Progress bar */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-200">{mission.goal}</span>
                  <span className="text-xs text-emerald-400">{mission.status}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${mission.progress}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">{mission.progress}% progress</p>
              </div>

              {/* Current Performance */}
              <div className="glass-card p-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">Current Performance</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{mission.analysis.currentPerformance}</p>
              </div>

              {/* Problems */}
              <div className="glass-card p-4">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase mb-2">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-400" /> Problems Identified
                </h3>
                <ul className="space-y-1">
                  {mission.analysis.problems.map((p, i) => (
                    <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                      <span className="text-rose-400 mt-0.5">•</span>{p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="glass-card p-4">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase mb-2">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Recommended Actions
                </h3>
                <div className="space-y-2">
                  {mission.analysis.actions.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-300">{a.action}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] rounded bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5">Impact: {a.impact}</span>
                          <span className="text-[10px] rounded bg-sky-500/10 text-sky-400 px-1.5 py-0.5">Priority: {a.priority}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estimated Impact */}
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                <p className="text-sm text-emerald-300">{mission.analysis.estimatedImpact}</p>
              </div>

              {/* Ask follow-up */}
              <button
                onClick={() => onAsk(`Analyze progress for: ${mission.goal}`)}
                className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 px-4 py-2.5 text-sm text-slate-300 hover:text-emerald-300 transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
                Ask AI to analyze further
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
