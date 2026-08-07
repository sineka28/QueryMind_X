import { motion } from "framer-motion";
import { Target, ArrowRight, Clock, TrendingUp } from "lucide-react";
import type { StrategyRecommendation } from "@/lib/types";

export function StrategyPanel({ strategy }: { strategy: StrategyRecommendation }) {
  const priorityColors: Record<string, string> = {
    high: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600">
          <Target className="h-4 w-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">AI Strategy Recommendations</h3>
      </div>

      <p className="text-xs text-slate-500 mb-1">Objective: {strategy.objective}</p>
      <p className="text-sm text-slate-300 leading-relaxed mb-3">{strategy.currentSituation}</p>

      <div className="space-y-2 mb-3">
        {strategy.recommendations.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-start gap-2.5 rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2.5"
          >
            <ArrowRight className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-slate-300 leading-relaxed">{r.action}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[10px] rounded border px-1.5 py-0.5 ${priorityColors[r.priority] ?? priorityColors.medium}`}>
                  {r.priority} priority
                </span>
                <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
                  <TrendingUp className="h-3 w-3" /> {r.impact} impact
                </span>
                <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
                  <Clock className="h-3 w-3" /> {r.timeline}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-2.5">
        <p className="text-xs text-indigo-300 leading-relaxed">{strategy.summary}</p>
      </div>
    </motion.div>
  );
}
