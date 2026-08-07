import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Download, ChevronDown, ChevronUp, Clock, Rows3, ShieldCheck, ShieldAlert, GitCompare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatResult } from "@/lib/types";
import { useToast } from "@/lib/toast";
import { copyToClipboard, downloadFile, getConfidenceLabel, getConfidenceRingColor, highlightDiff } from "@/lib/utils";

interface SqlPanelProps {
  result: ChatResult;
}

export function SqlPanel({ result }: SqlPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const { toast } = useToast();
  const conf = getConfidenceLabel(result.confidence);
  const ringColor = getConfidenceRingColor(result.confidence);

  const handleCopy = () => {
    copyToClipboard(result.sql);
    toast("copied", "SQL copied to clipboard");
  };

  const handleDownload = () => {
    downloadFile("querymind-query.sql", result.sql, "text/sql");
    toast("export", "SQL file downloaded");
  };

  const diff = result.corrected && result.originalSql ? highlightDiff(result.originalSql, result.sql) : null;

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          {result.blocked ? (
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          )}
          <span className="text-xs font-semibold text-slate-300">
            {result.blocked ? "Blocked Query" : "Generated SQL"}
          </span>
          {result.corrected && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
              <GitCompare className="h-3 w-3" /> Auto-corrected
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
            aria-label="Copy SQL"
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
            aria-label="Download SQL"
          >
            <Download className="h-3.5 w-3.5" /> SQL
          </button>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 px-4 py-2 text-[11px] text-slate-500 border-b border-white/5 bg-slate-900/20">
        {!result.blocked && !result.error && (
          <>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {result.executionMs}ms
            </span>
            <span className="flex items-center gap-1">
              <Rows3 className="h-3 w-3" /> {result.rowCount} rows
            </span>
          </>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: ringColor }}
          />
          Confidence: {Math.round(result.confidence * 100)}% · {conf.label}
        </span>
      </div>

      {/* Code */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {diff ? (
              <div className="space-y-0">
                <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-rose-400/70 bg-rose-500/5 border-b border-white/5">
                  Original (failed)
                </div>
                <div className="code-block px-4 py-3 overflow-x-auto scrollbar-thin">
                  {diff.originalParts.map((p, i) => (
                    <span key={i} className={p.changed ? "bg-rose-500/20 text-rose-300 rounded px-0.5" : ""}>
                      {p.text}
                    </span>
                  ))}
                </div>
                <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-emerald-400/70 bg-emerald-500/5 border-b border-white/5">
                  Corrected
                </div>
                <div className="code-block px-4 py-3 overflow-x-auto scrollbar-thin">
                  {diff.correctedParts.map((p, i) => (
                    <span key={i} className={p.changed ? "bg-emerald-500/20 text-emerald-300 rounded px-0.5" : ""}>
                      {p.text}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <SyntaxHighlighter
                language="sql"
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  background: "transparent",
                  padding: "14px 16px",
                  fontSize: "13px",
                }}
                codeTagProps={{ className: "code-block" }}
              >
                {result.sql}
              </SyntaxHighlighter>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
