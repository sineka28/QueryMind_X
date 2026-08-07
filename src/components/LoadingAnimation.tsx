import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, FileCode2, ShieldCheck, Wrench, BarChart3, Lightbulb, MessageSquare, TrendingUp, Target } from "lucide-react";

const AGENT_STEPS = [
  { label: "Planner understanding intent", icon: Brain },
  { label: "Engineering SQL query", icon: FileCode2 },
  { label: "Security validation", icon: ShieldCheck },
  { label: "Executing query", icon: BarChart3 },
  { label: "Building visualization", icon: BarChart3 },
  { label: "Analyzing business impact", icon: Lightbulb },
  { label: "Forecasting predictions", icon: TrendingUp },
  { label: "Formulating strategy", icon: Target },
  { label: "Preparing follow-ups", icon: MessageSquare },
];

export function LoadingAnimation({ retrying }: { retrying?: boolean }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStep(s => (s < AGENT_STEPS.length - 1 ? s + 1 : s)), 450);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 py-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg">
        <Brain className="h-4 w-4 text-white animate-pulse" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-200 mb-3">{retrying ? "SQL Repair Agent retrying..." : "Autonomous AI Team working..."}</p>
        <div className="space-y-2">
          {AGENT_STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <div key={i} className="flex items-center gap-2.5">
                <div className={`flex h-6 w-6 items-center justify-center rounded-lg transition-all ${done ? "bg-emerald-500/20 text-emerald-400" : active ? "bg-sky-500/20 text-sky-400" : "bg-white/5 text-slate-600"}`}>
                  <AnimatePresence mode="wait">
                    {done ? (
                      <motion.svg key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></motion.svg>
                    ) : (
                      <Icon className={`h-3.5 w-3.5 ${active ? "animate-pulse" : ""}`} />
                    )}
                  </AnimatePresence>
                </div>
                <span className={`text-xs transition-colors ${done ? "text-slate-500 line-through" : active ? "text-slate-200 font-medium" : "text-slate-600"}`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
