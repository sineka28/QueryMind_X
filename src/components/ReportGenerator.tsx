import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Download, Loader2, X, FileBarChart, TrendingUp, AlertTriangle, Target, Sparkles, ShieldAlert, Lightbulb, ArrowRight, Code2 } from "lucide-react";
import type { ChatResult } from "@/lib/types";
import { downloadFile } from "@/lib/utils";

interface ReportGeneratorProps {
  result: ChatResult;
  question: string;
  onClose: () => void;
}

export function ReportGenerator({ result, question, onClose }: ReportGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const analysis = result.analysis;

  const generateReport = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 1200);
  };

  const exportPdf = () => {
    const html = buildReportHtml(result, question);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) {
      w.onload = () => {
        setTimeout(() => w.print(), 500);
      };
    }
    URL.revokeObjectURL(url);
  };

  const exportText = () => {
    const text = buildReportText(result, question);
    downloadFile("querymind-executive-report.txt", text, "text/plain");
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
        className="glass-card w-full max-w-2xl max-h-[88vh] overflow-y-auto scrollbar-thin"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 sticky top-0 bg-slate-900/80 backdrop-blur-xl z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold gradient-text">Executive Report</h2>
              <p className="text-xs text-slate-500">AI-generated analysis report</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {!generated && !generating && (
            <div className="text-center py-8">
              <FileBarChart className="h-12 w-12 text-sky-400/50 mx-auto mb-3" />
              <p className="text-sm text-slate-400 mb-4">Generate a comprehensive executive report from this query's results.</p>
              <button
                onClick={generateReport}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:from-sky-400 hover:to-violet-500 transition-all mx-auto"
              >
                <Sparkles className="h-4 w-4" />
                Generate Executive Report
              </button>
            </div>
          )}

          {generating && (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="h-8 w-8 text-sky-400 animate-spin mb-3" />
              <p className="text-sm text-slate-400">Compiling executive report...</p>
            </div>
          )}

          {generated && analysis && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <ReportSection icon={FileText} label="Executive Summary" color="text-sky-400">
                <p className="text-sm text-slate-300 leading-relaxed">{analysis.executiveSummary}</p>
              </ReportSection>

              <ReportSection icon={Target} label="Key Findings" color="text-violet-400">
                <ul className="space-y-1">
                  {analysis.keyFindings.map((f, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                      <span className="text-slate-600 mt-0.5">•</span>{f}
                    </li>
                  ))}
                </ul>
              </ReportSection>

              <ReportSection icon={TrendingUp} label="Trends" color="text-emerald-400">
                <ul className="space-y-1">
                  {analysis.trends.map((t, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                      <span className="text-slate-600 mt-0.5">•</span>{t}
                    </li>
                  ))}
                </ul>
              </ReportSection>

              <ReportSection icon={AlertTriangle} label="Anomalies" color="text-amber-400">
                <ul className="space-y-1">
                  {analysis.anomalies.map((a, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                      <span className="text-slate-600 mt-0.5">•</span>{a}
                    </li>
                  ))}
                </ul>
              </ReportSection>

              <ReportSection icon={FileBarChart} label="Business Impact" color="text-blue-400">
                <p className="text-sm text-slate-300 leading-relaxed">{analysis.businessImpact}</p>
              </ReportSection>

              <ReportSection icon={Sparkles} label="Recommendations" color="text-cyan-400">
                <ul className="space-y-1">
                  {analysis.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                      <ArrowRight className="h-3.5 w-3.5 text-cyan-400 mt-0.5 shrink-0" />{r}
                    </li>
                  ))}
                </ul>
              </ReportSection>

              <ReportSection icon={ShieldAlert} label="Risks" color="text-rose-400">
                <ul className="space-y-1">
                  {analysis.risks.map((r, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                      <span className="text-slate-600 mt-0.5">•</span>{r}
                    </li>
                  ))}
                </ul>
              </ReportSection>

              <ReportSection icon={Lightbulb} label="Opportunities" color="text-teal-400">
                <ul className="space-y-1">
                  {analysis.opportunities.map((o, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                      <span className="text-slate-600 mt-0.5">•</span>{o}
                    </li>
                  ))}
                </ul>
              </ReportSection>

              <ReportSection icon={Code2} label="SQL Used" color="text-slate-400">
                <pre className="text-xs text-slate-300 font-mono bg-slate-900/50 rounded-lg p-3 overflow-x-auto scrollbar-thin whitespace-pre-wrap">{result.sql}</pre>
              </ReportSection>

              <ReportSection icon={FileText} label="Methodology" color="text-slate-400">
                <p className="text-sm text-slate-400 leading-relaxed">
                  This report was generated by QueryMind's multi-agent AI system. The Planner agent interpreted the question, the SQL Generator created a read-only PostgreSQL query, the Security agent validated it, and the Business Insight agent analyzed the returned data to produce this executive summary.
                </p>
              </ReportSection>

              <ReportSection icon={ArrowRight} label="Conclusions" color="text-indigo-400">
                <ul className="space-y-1">
                  {analysis.nextBestActions.map((a, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                      <ArrowRight className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />{a}
                    </li>
                  ))}
                </ul>
              </ReportSection>

              {/* Export buttons */}
              <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                <button
                  onClick={exportPdf}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:from-sky-400 hover:to-violet-500 transition-all"
                >
                  <Download className="h-4 w-4" />
                  Export as PDF
                </button>
                <button
                  onClick={exportText}
                  className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/10 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export as Text
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReportSection({ icon: Icon, label, color, children }: { icon: typeof FileText; label: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-sm font-semibold text-slate-200">{label}</span>
      </div>
      {children}
    </div>
  );
}

function buildReportHtml(result: ChatResult, question: string): string {
  const a = result.analysis;
  if (!a) return "<p>No analysis available</p>";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>QueryMind Executive Report</title>
<style>
  body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1a1a2e; line-height: 1.6; }
  h1 { color: #4338ca; border-bottom: 3px solid #6366f1; padding-bottom: 10px; }
  h2 { color: #3730a3; margin-top: 24px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
  ul { padding-left: 20px; }
  .sql { background: #1e1b4b; color: #c7d2fe; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; overflow-x: auto; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 11px; color: #999; }
</style></head><body>
<h1>QueryMind Executive Report</h1>
<div class="meta">Generated: ${new Date().toLocaleString()} | Query: ${question} | Rows: ${result.rowCount} | Execution: ${result.executionMs}ms</div>
<h2>Executive Summary</h2><p>${a.executiveSummary}</p>
<h2>Key Findings</h2><ul>${a.keyFindings.map(f => `<li>${f}</li>`).join("")}</ul>
<h2>Trends</h2><ul>${a.trends.map(t => `<li>${t}</li>`).join("")}</ul>
<h2>Anomalies</h2><ul>${a.anomalies.map(an => `<li>${an}</li>`).join("")}</ul>
<h2>Business Impact</h2><p>${a.businessImpact}</p>
<h2>Recommendations</h2><ul>${a.recommendations.map(r => `<li>${r}</li>`).join("")}</ul>
<h2>Risks</h2><ul>${a.risks.map(r => `<li>${r}</li>`).join("")}</ul>
<h2>Opportunities</h2><ul>${a.opportunities.map(o => `<li>${o}</li>`).join("")}</ul>
<h2>SQL Used</h2><div class="sql">${result.sql}</div>
<h2>Methodology</h2><p>This report was generated by QueryMind's multi-agent AI system. The Planner agent interpreted the question, the SQL Generator created a read-only PostgreSQL query, the Security agent validated it, and the Business Insight agent analyzed the returned data.</p>
<h2>Conclusions</h2><ul>${a.nextBestActions.map(n => `<li>${n}</li>`).join("")}</ul>
<div class="footer">Generated by QueryMind AI Analytics Platform</div>
</body></html>`;
}

function buildReportText(result: ChatResult, question: string): string {
  const a = result.analysis;
  if (!a) return "No analysis available";
  const lines = [
    "QUERYMIND EXECUTIVE REPORT",
    "=".repeat(50),
    `Generated: ${new Date().toLocaleString()}`,
    `Query: ${question}`,
    `Rows: ${result.rowCount} | Execution: ${result.executionMs}ms`,
    "",
    "EXECUTIVE SUMMARY",
    "-".repeat(20),
    a.executiveSummary,
    "",
    "KEY FINDINGS",
    "-".repeat(20),
    a.keyFindings.map(f => `  - ${f}`).join("\n"),
    "",
    "TRENDS",
    "-".repeat(20),
    a.trends.map(t => `  - ${t}`).join("\n"),
    "",
    "ANOMALIES",
    "-".repeat(20),
    a.anomalies.map(an => `  - ${an}`).join("\n"),
    "",
    "BUSINESS IMPACT",
    "-".repeat(20),
    a.businessImpact,
    "",
    "RECOMMENDATIONS",
    "-".repeat(20),
    a.recommendations.map(r => `  - ${r}`).join("\n"),
    "",
    "RISKS",
    "-".repeat(20),
    a.risks.map(r => `  - ${r}`).join("\n"),
    "",
    "OPPORTUNITIES",
    "-".repeat(20),
    a.opportunities.map(o => `  - ${o}`).join("\n"),
    "",
    "SQL USED",
    "-".repeat(20),
    result.sql,
    "",
    "METHODOLOGY",
    "-".repeat(20),
    "This report was generated by QueryMind's multi-agent AI system.",
    "",
    "CONCLUSIONS",
    "-".repeat(20),
    a.nextBestActions.map(n => `  - ${n}`).join("\n"),
    "",
    "=".repeat(50),
    "Generated by QueryMind AI Analytics Platform",
  ];
  return lines.join("\n");
}
