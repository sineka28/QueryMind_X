import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Loader2, X, TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { simulateDecision } from "@/lib/api";
import type { DecisionSimulation } from "@/lib/types";

const SCENARIOS = [
  "What happens if prices increase by 10%?",
  "What if we discontinue Product A?",
  "What if customer growth increases by 20%?",
  "What if we reduce cancellations by 50%?",
];

export function DecisionSimulator({ onClose, onAsk }: { onClose: () => void; onAsk: (q: string) => void }) {
  const [scenario, setScenario] = useState("");
  const [result, setResult] = useState<DecisionSimulation | null>(null);
  const [loading, setLoading] = useState(false);

  const run = (s: string) => {
    if (!s.trim() || loading) return;
    setLoading(true);
    setResult(null);
    simulateDecision(s)
      .then(setResult)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (scenario) run(scenario); }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-full max-w-3xl max-h-[88vh] overflow-y-auto scrollbar-thin"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 sticky top-0 bg-slate-900/80 backdrop-blur-xl z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold gradient-text">AI Decision Simulator</h2>
              <p className="text-xs text-slate-500">Simulate hypothetical business scenarios</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Input */}
          <div>
            <div className="flex gap-2">
              <input
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && run(scenario)}
                placeholder="Describe a scenario to simulate..."
                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
              />
              <button
                onClick={() => run(scenario)}
                disabled={loading || !scenario.trim()}
                className="rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg disabled:opacity-40"
              >
                Simulate
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SCENARIOS.map((s, i) => (
                <button key={i} onClick={() => { setScenario(s); run(s); }}
                  className="rounded-full bg-white/5 border border-white/10 hover:border-sky-500/30 px-2.5 py-1 text-[11px] text-slate-400 hover:text-sky-300 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-sky-400 animate-spin" />
              <span className="ml-2 text-sm text-slate-400">Running simulation...</span>
            </div>
          )}

          {result && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Summary */}
              <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 px-4 py-3">
                <p className="text-sm text-slate-300">{result.summary}</p>
                <p className="text-xs text-slate-500 mt-1">Confidence: {Math.round(result.confidence * 100)}%</p>
              </div>

              {/* Assumptions */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase mb-1.5">Assumptions</h3>
                <ul className="space-y-1">
                  {result.assumptions.map((a, i) => (
                    <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                      <span className="text-slate-600 mt-0.5">•</span>{a}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Results */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">Predicted Impact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.results.map((r, i) => {
                    const TrendIcon = r.trend === "up" ? TrendingUp : r.trend === "down" ? TrendingDown : Minus;
                    const trendColor = r.trend === "up" ? "text-emerald-400" : r.trend === "down" ? "text-rose-400" : "text-slate-400";
                    return (
                      <div key={i} className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-400">{r.metric}</span>
                          <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">{r.currentValue}</span>
                          <span className="text-slate-600">→</span>
                          <span className="font-semibold text-slate-100">{r.predictedValue}</span>
                          <span className={`text-xs ${trendColor}`}>{r.change}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart */}
              {result.chartData.length > 0 && (
                <div className="glass-card p-4">
                  <h3 className="text-sm font-semibold text-slate-200 mb-2">Comparison Chart</h3>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: "#0f1424", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="current" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Current" />
                        <Bar dataKey="projected" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Projected" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Risks */}
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase mb-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Risks
                </h3>
                <ul className="space-y-1">
                  {result.risks.map((r, i) => (
                    <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                      <span className="text-amber-400 mt-0.5">•</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
