import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { LayoutDashboard, Loader2, X, Save, Sparkles } from "lucide-react";
import { generateDashboard } from "@/lib/api";
import type { DashboardConfig, SavedDashboard } from "@/lib/types";
import { useToast } from "@/lib/toast";

const COLORS = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#fb7185", "#f472b6", "#22d3ee", "#a3e635"];

interface DashboardViewProps {
  prompt: string;
  onClose: () => void;
  onSave: (dashboard: SavedDashboard) => void;
}

export function DashboardView({ prompt, onClose, onSave }: DashboardViewProps) {
  const [dashboard, setDashboard] = useState<DashboardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    generateDashboard(prompt)
      .then(setDashboard)
      .catch(() => toast("error", "Failed to generate dashboard"))
      .finally(() => setLoading(false));
  }, [prompt]);

  const handleSave = () => {
    if (!dashboard) return;
    onSave({
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      title: dashboard.title,
      config: dashboard,
      createdAt: Date.now(),
    });
    toast("success", "Dashboard saved");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-full max-w-5xl max-h-[88vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold gradient-text">{dashboard?.title ?? "Dashboard"}</h2>
              <p className="text-xs text-slate-500">AI-generated dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dashboard && (
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/25 transition-colors"
              >
                <Save className="h-3.5 w-3.5" /> Save
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mb-3" />
            <p className="text-sm text-slate-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              Generating dashboard from your request...
            </p>
          </div>
        ) : dashboard ? (
          <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {dashboard.widgets.filter(w => w.type === "kpi").map((w, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-4"
                >
                  <p className="text-xs text-slate-500 mb-1">{w.kpi?.label}</p>
                  <p className="text-xl font-bold text-slate-100">{w.kpi?.value}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {dashboard.widgets.filter(w => w.type === "chart").map((w, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="glass-card p-4"
                >
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">{w.title}</h3>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      {w.chartType === "pie" ? (
                        <PieChart>
                          <Pie data={w.data as object[]} dataKey={w.yKeys![0]} nameKey={w.xKey} cx="50%" cy="50%" outerRadius={80} label={(e: { name?: string }) => e.name ?? ""}>
                            {(w.data ?? []).map((_, j) => <Cell key={j} fill={COLORS[j % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: "#0f1424", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                        </PieChart>
                      ) : w.chartType === "line" ? (
                        <LineChart data={w.data as object[]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey={w.xKey} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ background: "#0f1424", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                          <Line type="monotone" dataKey={w.yKeys![0]} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      ) : (
                        <BarChart data={w.data as object[]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey={w.xKey} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ background: "#0f1424", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                          <Bar dataKey={w.yKeys![0]} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              ))}
            </div>

            {dashboard.widgets.filter(w => w.type === "table").map((w, i) => {
              const data = w.data ?? [];
              const keys = data.length ? Object.keys(data[0]) : [];
              return (
                <motion.div
                  key={`table-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="glass-card p-4 mt-3"
                >
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">{w.title}</h3>
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5">
                          {keys.map(k => <th key={k} className="px-3 py-2 text-left text-[11px] font-semibold text-slate-400 uppercase">{k}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((row, j) => (
                          <tr key={j} className="border-b border-white/5">
                            {keys.map(k => <td key={k} className="px-3 py-2 text-slate-300">{String(row[k])}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center text-sm text-slate-400">Failed to generate dashboard.</div>
        )}
      </motion.div>
    </motion.div>
  );
}
