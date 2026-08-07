import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gauge, ChevronDown, ChevronUp } from "lucide-react";
import type { ConfidenceBreakdown } from "@/lib/types";
import { getConfidenceRingColor } from "@/lib/utils";

export function ConfidenceMeter({ breakdown }: { breakdown: ConfidenceBreakdown }) {
  const [expanded, setExpanded] = useState(false);
  const ringColor = getConfidenceRingColor(breakdown.overall);
  const pct = Math.round(breakdown.overall * 100);
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (pct / 100) * circumference;

  const bars = [
    { label: "Schema Match", value: breakdown.schemaMatch },
    { label: "Column Match", value: breakdown.columnMatch },
    { label: "Join Confidence", value: breakdown.joinConfidence },
    { label: "Aggregation", value: breakdown.aggregationConfidence },
  ];

  return (
    <div className="glass-card p-3">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3"
      >
        <div className="relative h-16 w-16 shrink-0">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <motion.circle
              cx="32" cy="32" r="28" fill="none" stroke={ringColor} strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-slate-100">{pct}%</span>
          </div>
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">AI Confidence</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Click to view reasoning breakdown</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-white/5 space-y-2.5">
              {bars.map((bar, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400">{bar.label}</span>
                    <span className="text-[11px] font-mono text-slate-300">{Math.round(bar.value * 100)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${bar.value * 100}%` }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{ background: getConfidenceRingColor(bar.value) }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 space-y-1">
                {breakdown.reasoning.map((r, i) => (
                  <p key={i} className="text-[11px] text-slate-500 leading-relaxed">{r}</p>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
