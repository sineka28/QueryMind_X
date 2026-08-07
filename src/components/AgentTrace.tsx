import { motion, AnimatePresence } from "framer-motion";
import { Brain, FileCode2, ShieldCheck, Wrench, BarChart3, Lightbulb, MessageSquare, Check, Loader2, Minus, TrendingUp, Target } from "lucide-react";
import type { AgentStep } from "@/lib/types";

const AGENT_ICONS: Record<string, typeof Brain> = {
  planner: Brain,
  "sql-gen": FileCode2,
  security: ShieldCheck,
  repair: Wrench,
  viz: BarChart3,
  insight: Lightbulb,
  prediction: TrendingUp,
  strategy: Target,
  "follow-up": MessageSquare,
};

export function AgentTrace({ steps }: { steps: AgentStep[] }) {
  return (
    <div className="glass-card p-3">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-600">
          <Brain className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-xs font-semibold text-slate-300">Multi-Agent Pipeline</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map((step, i) => {
          const Icon = AGENT_ICONS[step.agent] ?? Brain;
          return (
            <div key={step.agent} className="flex items-center gap-1.5">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border transition-colors ${
                  step.status === "done"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : step.status === "active"
                    ? "bg-sky-500/10 border-sky-500/30 text-sky-300"
                    : step.status === "skipped"
                    ? "bg-slate-700/30 border-slate-600/30 text-slate-500"
                    : "bg-white/5 border-white/10 text-slate-400"
                }`}
                title={step.detail}
              >
                {step.status === "done" ? (
                  <Check className="h-3 w-3" />
                ) : step.status === "active" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : step.status === "skipped" ? (
                  <Minus className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
                <span>{step.label}</span>
                {step.status === "done" && <span className="text-emerald-400">✓</span>}
              </motion.div>
              {i < steps.length - 1 && (
                <div className={`h-px w-3 ${step.status === "done" ? "bg-emerald-500/30" : "bg-slate-700"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
