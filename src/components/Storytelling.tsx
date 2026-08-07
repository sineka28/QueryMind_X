import { motion } from "framer-motion";
import { BookOpenText, Sparkles } from "lucide-react";
import type { Narrative } from "@/lib/types";

export function Storytelling({ narrative }: { narrative: Narrative }) {
  const sentences = narrative.story.split(/(?<=\.)\s+/);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600">
          <BookOpenText className="h-4 w-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">AI Storytelling</h3>
      </div>

      <p className="text-xs font-medium text-slate-400 mb-2">{narrative.title}</p>

      <div className="space-y-1.5 mb-3">
        {sentences.map((s, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className="text-sm text-slate-300 leading-relaxed"
          >
            {s}
          </motion.p>
        ))}
      </div>

      {narrative.highlights.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
          {narrative.highlights.map((h, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 text-[11px] text-rose-300">
              <Sparkles className="h-3 w-3" />
              {h}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
