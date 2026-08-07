import { motion } from "framer-motion";
import { HelpCircle, ArrowRight, Table2, Columns3 } from "lucide-react";
import type { ErrorRecovery as ErrorRecoveryType } from "@/lib/types";

interface Props {
  recovery: ErrorRecoveryType;
  onPickSuggestion: (q: string) => void;
}

export function ErrorRecoveryCard({ recovery, onPickSuggestion }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card border-amber-500/20 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20">
          <HelpCircle className="h-4 w-4 text-amber-400" />
        </div>
        <h3 className="text-sm font-semibold text-amber-300">Smart Error Recovery</h3>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed mb-3">{recovery.friendlyMessage}</p>

      {recovery.suggestedQuestion && (
        <motion.button
          whileHover={{ y: -1 }}
          onClick={() => onPickSuggestion(recovery.suggestedQuestion!)}
          className="flex items-center gap-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 px-3 py-2 text-sm text-sky-300 hover:bg-sky-500/25 transition-colors mb-3"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          {recovery.suggestedQuestion}
        </motion.button>
      )}

      {recovery.availableTables && recovery.availableTables.length > 0 && (
        <div className="mb-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1.5">
            <Table2 className="h-3 w-3" /> Available Tables
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recovery.availableTables.map(t => (
              <button
                key={t}
                onClick={() => onPickSuggestion(`Show all records from ${t}`)}
                className="rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-sky-500/10 hover:border-sky-500/30 hover:text-sky-300 transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {recovery.availableColumns && recovery.availableColumns.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1.5">
            <Columns3 className="h-3 w-3" /> Available Columns
          </p>
          <div className="flex flex-wrap gap-1">
            {recovery.availableColumns.slice(0, 12).map(c => (
              <span key={c} className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 font-mono">{c}</span>
            ))}
          </div>
        </div>
      )}

      {recovery.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/5">
          {recovery.suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onPickSuggestion(s)}
              className="flex items-center gap-1 rounded-full bg-white/5 border border-white/10 hover:border-sky-500/30 hover:bg-sky-500/10 px-2.5 py-1 text-[11px] text-slate-300 hover:text-sky-300 transition-colors"
            >
              {s}
              <ArrowRight className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
