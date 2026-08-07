import { useState } from "react";
import { motion } from "framer-motion";
import { User, Brain, AlertCircle, ShieldAlert, FileText } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { SqlPanel } from "./SqlPanel";
import { ExplanationPanel } from "./ExplanationPanel";
import { ChartView } from "./ChartView";
import { ResultsTable } from "./ResultsTable";
import { Insights } from "./Insights";
import { Suggestions } from "./Suggestions";
import { LoadingAnimation } from "./LoadingAnimation";
import { AgentTrace } from "./AgentTrace";
import { DataAnalystPanel } from "./DataAnalystPanel";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { SqlTeacher } from "./SqlTeacher";
import { Storytelling } from "./Storytelling";
import { KpiCards } from "./KpiCards";
import { ErrorRecoveryCard } from "./ErrorRecovery";
import { ReportGenerator } from "./ReportGenerator";
import { PredictionPanel } from "./PredictionPanel";
import { StrategyPanel } from "./StrategyPanel";
import { analyzeChart } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
  onPickSuggestion: (q: string) => void;
  rowsPerPage: number;
}

export function MessageBubble({ message, onPickSuggestion, rowsPerPage }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [showReport, setShowReport] = useState(false);
  const result = message.result;

  if (isUser) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-700 text-slate-300">
          <User className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-200 mb-1">You</p>
          <p className="text-sm text-slate-300 leading-relaxed">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 py-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg">
        <Brain className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        {message.loading ? (
          <LoadingAnimation retrying={message.loadingStage === 99} />
        ) : message.error ? (
          <>
            <ErrorCard error={message.error} />
            {result?.errorRecovery && <ErrorRecoveryCard recovery={result.errorRecovery} onPickSuggestion={onPickSuggestion} />}
            {result?.suggestions && <Suggestions suggestions={result.suggestions} onPick={onPickSuggestion} />}
          </>
        ) : result ? (
          <>
            {result.blocked ? (
              <BlockedCard result={result} />
            ) : (
              <>
                {result.agentTrace && <AgentTrace steps={result.agentTrace} />}
                {result.kpis && result.kpis.length > 0 && <KpiCards kpis={result.kpis} />}
                {result.confidenceBreakdown && <ConfidenceMeter breakdown={result.confidenceBreakdown} />}
                <SqlPanel result={result} />
                <ExplanationPanel result={result} />
                {result.sqlTeacher && <SqlTeacher teacher={result.sqlTeacher} />}
                {result.rows.length > 0 && <ChartView rows={result.rows} config={analyzeChart(result.rows)} />}
                <ResultsTable result={result} rowsPerPage={rowsPerPage} />
                {result.narrative && <Storytelling narrative={result.narrative} />}
                {result.prediction && <PredictionPanel prediction={result.prediction} />}
                {result.analysis && <DataAnalystPanel analysis={result.analysis} />}
                {result.strategy && <StrategyPanel strategy={result.strategy} />}
                {result.insights.length > 0 && <Insights insights={result.insights} />}
                {result.analysis && (
                  <button onClick={() => setShowReport(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500/15 to-violet-600/15 border border-sky-500/30 px-4 py-2.5 text-sm font-medium text-sky-300 hover:from-sky-500/25 hover:to-violet-600/25 transition-all">
                    <FileText className="h-4 w-4" /> Generate Executive Report
                  </button>
                )}
              </>
            )}
            <Suggestions suggestions={result.suggestions} onPick={onPickSuggestion} />
          </>
        ) : null}
      </div>
      {showReport && result && <ReportGenerator result={result} question={message.content} onClose={() => setShowReport(false)} />}
    </motion.div>
  );
}

function ErrorCard({ error }: { error: string }) {
  return (
    <div className="glass-card border-rose-500/20 p-4">
      <div className="flex items-center gap-2 mb-2"><AlertCircle className="h-4 w-4 text-rose-400" /><h3 className="text-sm font-semibold text-rose-300">Query Failed</h3></div>
      <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
    </div>
  );
}

function BlockedCard({ result }: { result: ChatMessage["result"] }) {
  return (
    <div className="glass-card border-amber-500/20 p-4">
      <div className="flex items-center gap-2 mb-2"><ShieldAlert className="h-4 w-4 text-amber-400" /><h3 className="text-sm font-semibold text-amber-300">Blocked: Read-only Mode</h3></div>
      <p className="text-sm text-slate-400 mb-3">{result?.blockedReason ?? "This query was blocked for safety."}</p>
      {result?.sql && (
        <div className="rounded-lg bg-rose-500/5 border border-rose-500/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-rose-400/70 mb-1">Attempted SQL</p>
          <pre className="text-xs text-slate-300 font-mono overflow-x-auto scrollbar-thin whitespace-pre-wrap">{result.sql}</pre>
        </div>
      )}
    </div>
  );
}
