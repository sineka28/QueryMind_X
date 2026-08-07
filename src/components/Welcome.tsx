import { motion } from "framer-motion";
import { Brain, Sparkles, TrendingUp, Users, Package, MapPin } from "lucide-react";

const SUGGESTED = [
  "Top 10 customers by revenue",
  "Monthly sales trend",
  "Average order value",
  "Products never ordered",
  "Customers from New York",
  "Orders this year",
  "Revenue by category",
  "Cancelled orders",
  "Most expensive products",
];

interface WelcomeProps {
  onPick: (q: string) => void;
}

export function Welcome({ onPick }: WelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center text-center max-w-2xl"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 shadow-2xl shadow-blue-500/30 mb-6 animate-float">
          <Brain className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-3">QueryMind</h1>
        <p className="text-slate-400 text-base sm:text-lg mb-2">
          Ask your database anything using natural language.
        </p>
        <p className="text-slate-500 text-sm mb-8 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          AI-powered SQL generation with auto-visualization and insights
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 w-full">
          {SUGGESTED.map((q, i) => {
            const Icon = [TrendingUp, Users, Package, MapPin, MapPin, TrendingUp, Package, TrendingUp, Package][i % 9];
            return (
              <motion.button
                key={q}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                whileHover={{ y: -2, scale: 1.02 }}
                onClick={() => onPick(q)}
                className="glass-card group flex items-center gap-2.5 px-4 py-3 text-left hover:border-sky-500/30 transition-colors"
              >
                <Icon className="h-4 w-4 text-sky-400 shrink-0 group-hover:text-violet-400 transition-colors" />
                <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">{q}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
