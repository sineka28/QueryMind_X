import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface SuggestionsProps {
  suggestions: string[];
  onPick: (q: string) => void;
}

export function Suggestions({ suggestions, onPick }: SuggestionsProps) {
  if (!suggestions.length) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {suggestions.map((s, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.06 }}
          whileHover={{ y: -1 }}
          onClick={() => onPick(s)}
          className="group flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 hover:border-sky-500/40 hover:bg-sky-500/10 px-3 py-1.5 text-xs text-slate-300 hover:text-sky-300 transition-colors"
        >
          {s}
          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      ))}
    </div>
  );
}
