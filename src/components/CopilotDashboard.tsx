import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, AlertTriangle, TrendingUp, Target, Sparkles, ShieldAlert,
  ArrowRight, Heart, Zap, Brain, Loader2,
} from "lucide-react";
import { fetchCopilot } from "@/lib/api";
import type { CopilotData } from "@/lib/types";
import { KpiCards } from "@/components/KpiCards";

interface CopilotDashboardProps {
  onAsk: (q: string) => void;
  onOpenMission: () => void;
  onOpenSimulator: () => void;
  onOpenDetective: () => void;
  onOpenMeeting: () => void;
  onOpenPresentation: () => void;
  onOpenDashboard: () => void;
}

const SUGGESTED = [
  "Top 10 customers by revenue",
  "Monthly sales trend",
  "Revenue by category",
  "Products never ordered",
  "Average order value",
  "Orders by status",
];

export function CopilotDashboard(props: CopilotDashboardProps) {
  const [data, setData] = useState<CopilotData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCopilot()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-sky-400 animate-spin mb-3" />
        <p className="text-sm text-slate-400">Loading Executive Command Center...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Brain className="h-12 w-12 text-slate-600 mb-3" />
        <p className="text-sm text-slate-500">Unable to load dashboard data.</p>
      </div>
    );
  }

  const healthColor = data.healthScore >= 70 ? "#34d399" : data.healthScore >= 50 ? "#fbbf24" : "#fb7185";
  const riskColor = data.riskMeter.score < 30 ? "#34d399" : data.riskMeter.score < 60 ? "#fbbf24" : "#fb7185";

  return (
    <div className="py-6 px-1 space-y-5">
      {/* Greeting + Health Score */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">{data.greeting}</h1>
          <p className="text-sm text-slate-500 mt-1">Here's your business intelligence overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <HealthScoreRing score={data.healthScore} color={healthColor} />
          <div className="space-y-1">
            <p className="text-xs text-slate-500">Business Health</p>
            <p className="text-lg font-bold" style={{ color: healthColor }}>{data.healthScore}/100</p>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <KpiCards kpis={data.kpis} />

      {/* Risk Meter + Opportunity + Confidence */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          icon={ShieldAlert}
          label="Business Risk Meter"
          value={data.riskMeter.level}
          score={data.riskMeter.score}
          color={riskColor}
          factors={data.riskMeter.factors}
        />
        <MetricCard
          icon={Target}
          label="Opportunity Score"
          value={`${data.opportunityScore}/100`}
          score={data.opportunityScore}
          color="#38bdf8"
        />
        <MetricCard
          icon={Zap}
          label="AI Confidence"
          value={`${data.confidenceScore}/100`}
          score={data.confidenceScore}
          color="#a78bfa"
        />
      </div>

      {/* AI Alerts */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">AI Alerts</h3>
        </div>
        <div className="space-y-2">
          {data.alerts.map((alert, i) => {
            const color = alert.severity === "high" ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
              : alert.severity === "medium" ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
              : alert.severity === "info" ? "text-sky-400 bg-sky-500/10 border-sky-500/20"
              : "text-slate-400 bg-white/5 border-white/10";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${color}`}
              >
                <span className="font-semibold uppercase">{alert.severity}</span>
                <span className="text-slate-300">{alert.message}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Today's Insights + Recommended Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-slate-200">Today's Insights</h3>
          </div>
          <div className="space-y-1.5">
            {data.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-violet-400 mt-0.5">•</span>
                <span className="leading-relaxed">{insight}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">Recommended Actions</h3>
          </div>
          <div className="space-y-1.5">
            {data.recommendedActions.map((action, i) => (
              <button
                key={i}
                onClick={() => props.onAsk(action)}
                className="flex items-start gap-2 text-xs text-slate-400 hover:text-emerald-300 transition-colors w-full text-left group"
              >
                <ArrowRight className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                <span className="leading-relaxed">{action}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">AI Tools</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <QuickAction icon={Target} label="Mission Mode" color="text-emerald-400" onClick={props.onOpenMission} />
          <QuickAction icon={Activity} label="Decision Sim" color="text-sky-400" onClick={props.onOpenSimulator} />
          <QuickAction icon={ShieldAlert} label="Data Detective" color="text-amber-400" onClick={props.onOpenDetective} />
          <QuickAction icon={Brain} label="Meeting Mode" color="text-violet-400" onClick={props.onOpenMeeting} />
          <QuickAction icon={Sparkles} label="Presentation" color="text-rose-400" onClick={props.onOpenPresentation} />
          <QuickAction icon={Heart} label="Dashboard" color="text-blue-400" onClick={props.onOpenDashboard} />
        </div>
      </div>

      {/* Suggested Questions */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Try asking</h3>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((q, i) => (
            <button
              key={i}
              onClick={() => props.onAsk(q)}
              className="rounded-full bg-white/5 border border-white/10 hover:border-sky-500/40 hover:bg-sky-500/10 px-3 py-1.5 text-xs text-slate-300 hover:text-sky-300 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HealthScoreRing({ score, color }: { score: number; color: string }) {
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative h-16 w-16">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <motion.circle
          cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Heart className="h-5 w-5" style={{ color }} />
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, score, color, factors }: {
  icon: typeof Activity; label: string; value: string; score: number; color: string; factors?: string[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className="h-4 w-4" style={{ color }} />
          <span className="text-xs text-slate-400">{label}</span>
        </div>
        <span className="text-sm font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      {factors && factors.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {factors.map((f, i) => (
            <p key={i} className="text-[10px] text-slate-500">• {f}</p>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function QuickAction({ icon: Icon, label, color, onClick }: {
  icon: typeof Activity; label: string; color: string; onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 px-3 py-3 transition-colors"
    >
      <Icon className="h-5 w-5" style={{ color }} />
      <span className="text-[11px] text-slate-400 text-center">{label}</span>
    </motion.button>
  );
}
