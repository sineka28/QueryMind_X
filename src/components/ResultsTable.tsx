import { useMemo, useState } from "react";
import { Search, Download, Copy, ChevronUp, ChevronDown, ArrowRight, ArrowLeft } from "lucide-react";
import type { ChatResult } from "@/lib/types";
import { useToast } from "@/lib/toast";
import { toCsv, downloadFile, copyToClipboard, formatNumber, isNumericValue } from "@/lib/utils";

interface ResultsTableProps {
  result: ChatResult;
  rowsPerPage?: number;
}

export function ResultsTable({ result, rowsPerPage = 10 }: ResultsTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const { toast } = useToast();

  const keys = useMemo(() => (result.rows.length ? Object.keys(result.rows[0]) : []), [result.rows]);

  const filtered = useMemo(() => {
    if (!search) return result.rows;
    const q = search.toLowerCase();
    return result.rows.filter((r) =>
      keys.some((k) => String(r[k] ?? "").toLowerCase().includes(q))
    );
  }, [result.rows, search, keys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null) return 1;
      if (bv === null) return -1;
      if (isNumericValue(av) && isNumericValue(bv)) {
        const an = Number(String(av).replace(/[$,%\s]/g, ""));
        const bn = Number(String(bv).replace(/[$,%\s]/g, ""));
        return sortDir === "asc" ? an - bn : bn - an;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const pageRows = sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const handleSort = (k: string) => {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const handleExportCsv = () => {
    downloadFile("querymind-results.csv", toCsv(sorted), "text/csv");
    toast("export", "Results exported to CSV");
  };

  const handleCopyResults = () => {
    copyToClipboard(toCsv(sorted));
    toast("copied", "Results copied to clipboard");
  };

  const handleCopyCell = (val: unknown) => {
    copyToClipboard(String(val ?? ""));
    toast("copied", "Cell copied");
  };

  if (!result.rows.length) return null;

  return (
    <div className="glass-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/5 bg-slate-900/30">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-200">Results</h3>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
            {sorted.length} of {result.rowCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search..."
              className="rounded-lg bg-white/5 border border-white/10 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 w-32 sm:w-44"
            />
          </div>
          <button
            onClick={handleCopyResults}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
            aria-label="Copy results"
          >
            <Copy className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Copy</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
            aria-label="Export CSV"
          >
            <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin max-h-[420px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-xl">
            <tr>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-white/5">#</th>
              {keys.map((k) => (
                <th
                  key={k}
                  onClick={() => handleSort(k)}
                  className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5 cursor-pointer hover:text-slate-200 transition-colors whitespace-nowrap select-none"
                >
                  <div className="flex items-center gap-1">
                    {k}
                    {sortKey === k && (
                      sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                <td className="px-3 py-2.5 text-xs text-slate-600">{page * rowsPerPage + i + 1}</td>
                {keys.map((k) => {
                  const val = row[k];
                  const isNull = val === null || val === undefined;
                  return (
                    <td
                      key={k}
                      onClick={() => !isNull && handleCopyCell(val)}
                      className="px-3 py-2.5 text-slate-300 cursor-pointer hover:text-sky-300 transition-colors whitespace-nowrap max-w-[240px] overflow-hidden text-ellipsis"
                      title={isNull ? "NULL" : String(val)}
                    >
                      {isNull ? (
                        <span className="text-slate-600 italic text-xs">NULL</span>
                      ) : isNumericValue(val) ? (
                        <span className="font-mono text-xs">{formatNumber(val)}</span>
                      ) : (
                        <span className="text-sm">{String(val)}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5 bg-slate-900/20">
          <span className="text-xs text-slate-500">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 disabled:opacity-30 transition-colors"
              aria-label="Previous page"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 disabled:opacity-30 transition-colors"
              aria-label="Next page"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
