import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, DollarSign, Users, ShoppingBag, Package, BarChart3, Hash, Award, Target } from "lucide-react";
import type { KpiCard as KpiCardType } from "@/lib/types";

const ICON_MAP: Record<string, typeof DollarSign> = {
  dollar: DollarSign, users: Users, orders: ShoppingBag, products: Package,
  sum: BarChart3, avg: Target, max: Award, min: Target, count: Hash, metric: BarChart3,
};

export function KpiCards({ kpis }: { kpis: KpiCardType[] }) {
  if (!kpis.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
      {kpis.map((kpi, i) => {
        const Icon = ICON_MAP[kpi.icon ?? ""] ?? BarChart3;
        const TrendIcon = kpi.trend === "up" ? TrendingUp : kpi.trend === "down" ? TrendingDown : Minus;
        const trendColor = kpi.trend === "up" ? "text-emerald-400" : kpi.trend === "down" ? "text-rose-400" : "text-slate-500";
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -2 }}
            className="glass-card p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-white/5">
                <Icon className="h-3.5 w-3.5 text-sky-400" />
              </div>
              {kpi.trend && <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />}
            </div>
            <p className="text-lg font-bold text-slate-100 leading-tight">{kpi.value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{kpi.label}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
