import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, ShoppingBag, DollarSign, Package, TrendingUp, CheckCircle2, Clock, XCircle } from "lucide-react";
import { fetchStats } from "@/lib/api";
import type { Stats } from "@/lib/types";

export function StatsDashboard({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { label: "Total Customers", value: stats.customers, icon: Users, color: "from-sky-500 to-blue-600" },
    { label: "Total Orders", value: stats.orders, icon: ShoppingBag, color: "from-violet-500 to-purple-600" },
    { label: "Total Revenue", value: stats.revenue, prefix: "$", icon: DollarSign, color: "from-emerald-500 to-teal-600", decimals: 2 },
    { label: "Products", value: stats.products, icon: Package, color: "from-amber-500 to-orange-600" },
    { label: "Avg Order Value", value: stats.averageOrderValue, prefix: "$", icon: TrendingUp, color: "from-pink-500 to-rose-600", decimals: 2 },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "from-emerald-500 to-green-600" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "from-amber-500 to-yellow-600" },
    { label: "Cancelled", value: stats.cancelled, icon: XCircle, color: "from-rose-500 to-red-600" },
  ] : [];

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
        className="glass-card w-full max-w-4xl max-h-[85vh] overflow-y-auto scrollbar-thin p-6"
      >
        <h2 className="text-xl font-bold gradient-text mb-1">Dashboard Statistics</h2>
        <p className="text-sm text-slate-500 mb-6">Live overview of your analytics database</p>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cards.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-4"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${c.color} shadow-lg mb-3`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-slate-100">
                    {c.prefix ?? ""}{typeof c.value === "number" && c.decimals ? c.value.toFixed(c.decimals) : (c.value as number).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
