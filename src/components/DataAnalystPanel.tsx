import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, TrendingUp, AlertTriangle, Target, ShieldAlert, Sparkles, ArrowRight, BarChart3 } from "lucide-react";
import type { DataAnalysis } from "@/lib/types";

export function DataAnalystPanel({ analysis }: { analysis: DataAnalysis }) {
  const sections = [
    { icon: BarChart3, label: "Executive Summary", content: analysis.executiveSummary, color: "text-sky-400 bg-sky-500/10" },
    { icon: Target, label: "Key Findings", items: analysis.keyFindings, color: "text-violet-400 bg-violet-500/10" },
    { icon: TrendingUp, label: "Trends", items: analysis.trends, color: "text-emerald-400 bg-emerald-500/10" },
    { icon: AlertTriangle, label: "Anomalies", items: analysis.anomalies, color: "text-amber-400 bg-amber-500/10" },
    { icon: BarChart3, label: "Business Impact", content: analysis.businessImpact, color: "text-blue-400 bg-blue-500/10" },
    { icon: Sparkles, label: "Recommendations", items: analysis.recommendations, color: "text-cyan-400 bg-cyan-500/10" },
    { icon: ShieldAlert, label: "Possible Risks", items: analysis.risks, color: "text-rose-400 bg-rose-500/10" },
    { icon: Lightbulb, label: "Opportunities", items: analysis.opportunities, color: "text-teal-400 bg-teal-500/10" },
    { icon: ArrowRight, label: "Next Best Actions", items: analysis.nextBestActions, color: "text-indigo-400 bg-indigo-500/10" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
          <Lightbulb className="h-4 w-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">AI Data Analyst</h3>
      </div>

      <div className="space-y-3">
        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`flex h-5 w-5 items-center justify-center rounded ${section.color}`}>
                  <Icon className="h-3 w-3" />
                </div>
                <span className="text-xs font-semibold text-slate-300">{section.label}</span>
              </div>
              {"content" in section && section.content ? (
                <p className="text-xs text-slate-400 leading-relaxed pl-7 mb-2">{section.content}</p>
              ) : (
                "items" in section && section.items && section.items.length > 0 ? (
                  <ul className="pl-7 space-y-1 mb-2">
                    {section.items.map((item, j) => (
                      <li key={j} className="text-xs text-slate-400 leading-relaxed flex items-start gap-1.5">
                        <span className="text-slate-600 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
