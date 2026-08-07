import { motion } from "framer-motion";
import { GraduationCap, BookOpen, KeyRound } from "lucide-react";
import type { SqlTeacher as SqlTeacherType } from "@/lib/types";

export function SqlTeacher({ teacher }: { teacher: SqlTeacherType }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
          <GraduationCap className="h-4 w-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">AI SQL Teacher</h3>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed mb-3">{teacher.purpose}</p>

      <div className="space-y-2 mb-3">
        {teacher.clauses.map((clause, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-start gap-2.5 rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2"
          >
            <span className="shrink-0 rounded-md bg-sky-500/15 border border-sky-500/20 px-2 py-0.5 text-[11px] font-mono font-semibold text-sky-300">
              {clause.keyword}
            </span>
            <span className="text-xs text-slate-400 leading-relaxed">{clause.explanation}</span>
          </motion.div>
        ))}
      </div>

      {teacher.concepts.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <BookOpen className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-slate-300">Concepts Learned</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {teacher.concepts.map((c, i) => (
              <span key={i} className="flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 text-[11px] text-violet-300">
                <KeyRound className="h-3 w-3" />
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
