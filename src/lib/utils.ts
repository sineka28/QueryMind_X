import type { ChatResult } from "./types";

export interface ChartConfig {
  chartType: "bar" | "line" | "area" | "pie" | "none";
  xKey?: string;
  yKeys: string[];
}

export function analyzeChart(rows: Record<string, unknown>[]): ChartConfig {
  if (!rows.length) return { chartType: "none", yKeys: [] };
  const keys = Object.keys(rows[0]);
  const numericKeys: string[] = [];
  const textKeys: string[] = [];

  for (const k of keys) {
    const samples = rows.slice(0, 8).map((r) => r[k]).filter((v) => v !== null && v !== undefined);
    if (!samples.length) continue;
    const allNumeric = samples.every((v) => {
      if (typeof v === "number") return true;
      if (typeof v === "string") {
        const cleaned = v.replace(/[$,%\s]/g, "");
        return cleaned !== "" && !isNaN(Number(cleaned));
      }
      return false;
    });
    if (allNumeric) numericKeys.push(k);
    else textKeys.push(k);
  }

  if (!numericKeys.length) return { chartType: "none", yKeys: [] };

  const xKey = textKeys[0] ?? keys[0];
  let yKeys = numericKeys;
  if (yKeys.length > 1) yKeys = [numericKeys[0]];

  let chartType: ChartConfig["chartType"] = "bar";
  if (textKeys.length && numericKeys.length === 1 && rows.length <= 12) {
    chartType = "pie";
  } else if (/month|date|year|time/i.test(xKey)) {
    chartType = "line";
  } else if (rows.length > 12) {
    chartType = "bar";
  }

  return { chartType, xKey, yKeys };
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    const s = val === null || val === undefined ? "" : String(val);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = keys.join(",");
  const body = rows.map((r) => keys.map((k) => escape(r[k])).join(",")).join("\n");
  return `${header}\n${body}`;
}

export function downloadFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) return navigator.clipboard.writeText(text);
  return new Promise((resolve) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    resolve();
  });
}

export function formatNumber(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return val.toLocaleString();
  const n = Number(String(val).replace(/[$,%\s]/g, ""));
  if (!isNaN(n) && /^\s*[\d.,$]+\s*$/.test(String(val))) return n.toLocaleString();
  return String(val);
}

export function isNumericValue(val: unknown): boolean {
  if (typeof val === "number") return true;
  if (typeof val === "string") {
    const cleaned = val.replace(/[$,%\s]/g, "");
    return cleaned !== "" && !isNaN(Number(cleaned));
  }
  return false;
}

export function highlightDiff(original: string, corrected: string): { originalParts: { text: string; changed: boolean }[]; correctedParts: { text: string; changed: boolean }[] } {
  const origWords = original.split(/(\s+)/);
  const corrWords = corrected.split(/(\s+)/);
  const maxLen = Math.max(origWords.length, corrWords.length);
  const originalParts: { text: string; changed: boolean }[] = [];
  const correctedParts: { text: string; changed: boolean }[] = [];

  for (let i = 0; i < maxLen; i++) {
    const o = origWords[i] ?? "";
    const c = corrWords[i] ?? "";
    const changed = o !== c;
    if (o) originalParts.push({ text: o, changed });
    if (c) correctedParts.push({ text: c, changed });
  }
  return { originalParts, correctedParts };
}

export function getConfidenceLabel(confidence: number): { label: string; color: string } {
  if (confidence >= 0.85) return { label: "High", color: "text-emerald-400" };
  if (confidence >= 0.6) return { label: "Medium", color: "text-amber-400" };
  if (confidence >= 0.35) return { label: "Low", color: "text-orange-400" };
  return { label: "Very Low", color: "text-rose-400" };
}

export function getConfidenceRingColor(confidence: number): string {
  if (confidence >= 0.85) return "#34d399";
  if (confidence >= 0.6) return "#fbbf24";
  if (confidence >= 0.35) return "#fb923c";
  return "#fb7185";
}

export function resultSummary(r: ChatResult): string {
  if (r.blocked) return "Blocked";
  if (r.error) return "Error";
  return `${r.rowCount} rows · ${r.executionMs}ms`;
}
