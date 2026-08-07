import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

export function Insights({ insights }: { insights: string[] }) {
  if (!insights.length) return null;
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20">
          <Lightbulb className="h-4 w-4 text-amber-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">Smart Insights</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-start gap-2 rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2"
          >
            <span className="text-amber-400 text-xs mt-0.5">•</span>
            <span className="text-xs text-slate-300 leading-relaxed">{insight}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
