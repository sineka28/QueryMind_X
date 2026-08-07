import { motion } from "framer-motion";
import { TrendingUp, Sparkles } from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { Prediction } from "@/lib/types";

export function PredictionPanel({ prediction }: { prediction: Prediction }) {
  const combined = [
    ...prediction.historical.map(h => ({ label: h.label, value: h.value, type: "historical" })),
    ...prediction.forecast.map(f => ({ label: f.label, value: f.value, upper: f.upper, lower: f.lower, type: "forecast" })),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">AI Predictive Analytics</h3>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] text-cyan-300">
          <Sparkles className="h-3 w-3" /> {Math.round(prediction.confidence * 100)}% confidence
        </span>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed mb-3">{prediction.summary}</p>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={combined}>
            <defs>
              <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={50} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "#0f1424", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
            <ReferenceLine x={prediction.historical[prediction.historical.length - 1]?.label} stroke="rgba(167,139,250,0.3)" strokeDasharray="4 4" label={{ value: "Forecast →", position: "top", fill: "#a78bfa", fontSize: 10 }} />
            <Area type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2} fill="url(#histGrad)" connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Forecast values */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {prediction.forecast.map((f, i) => (
          <div key={i} className="rounded-lg bg-violet-500/5 border border-violet-500/10 px-3 py-2">
            <p className="text-[10px] text-slate-500">{f.label}</p>
            <p className="text-sm font-semibold text-violet-300">{f.value.toLocaleString()}</p>
            <p className="text-[10px] text-slate-600">Range: {f.lower.toLocaleString()} - {f.upper.toLocaleString()}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-600 mt-2 text-center">Predictions are estimates based on trend analysis. Not financial advice.</p>
    </motion.div>
  );
}
