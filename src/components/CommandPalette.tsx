import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, CornerDownLeft, Brain, BarChart3, Database, Settings, Plus, Sparkles } from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onAsk: (q: string) => void;
  onNewChat: () => void;
  onOpenStats: () => void;
  onExplainSchema: () => void;
  onOpenSettings: () => void;
  onOpenSchemaExplorer: () => void;
  onGenerateDashboard: () => void;
  history: { id: string; question: string }[];
}

const QUICK_COMMANDS = [
  { id: "new", label: "New Chat", icon: Plus, action: "new" },
  { id: "stats", label: "Open Dashboard Stats", icon: BarChart3, action: "stats" },
  { id: "dashboard-gen", label: "AI Dashboard Generator", icon: Sparkles, action: "dashboard" },
  { id: "schema-explorer", label: "Schema Explorer (ER Diagram)", icon: Database, action: "schema-explorer" },
  { id: "schema", label: "Explain Schema", icon: Database, action: "schema" },
  { id: "settings", label: "Open Settings", icon: Settings, action: "settings" },
];

const SAMPLE_QUERIES = [
  "Top 10 customers by revenue",
  "Monthly sales trend",
  "Average order value",
  "Products never ordered",
  "Revenue by category",
  "Orders by status",
];

export function CommandPalette(props: CommandPaletteProps) {
  const { open, onClose, onAsk, onNewChat, onOpenStats, onExplainSchema, onOpenSettings, onOpenSchemaExplorer, onGenerateDashboard, history } = props;
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const items = useMemo(() => {
    const q = query.toLowerCase();
    const commands = QUICK_COMMANDS.filter((c) => !q || c.label.toLowerCase().includes(q)).map((c) => ({
      type: "command" as const,
      ...c,
    }));
    const samples = SAMPLE_QUERIES.filter((s) => !q || s.toLowerCase().includes(q)).map((s) => ({
      type: "query" as const,
      id: s,
      label: s,
      icon: Brain,
      action: "ask",
    }));
    const hist = history.filter((h) => !q || h.question.toLowerCase().includes(q)).slice(0, 4).map((h) => ({
      type: "history" as const,
      id: h.id,
      label: h.question,
      icon: Search,
      action: "ask",
    }));
    return [...commands, ...samples, ...hist];
  }, [query, history]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const execute = (item: (typeof items)[number]) => {
    if (item.action === "new") onNewChat();
    else if (item.action === "stats") onOpenStats();
    else if (item.action === "dashboard") onGenerateDashboard();
    else if (item.action === "schema-explorer") onOpenSchemaExplorer();
    else if (item.action === "schema") onExplainSchema();
    else if (item.action === "settings") onOpenSettings();
    else if (item.action === "ask") onAsk(item.label);
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[activeIndex]) execute(items[activeIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: -10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: -10 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-full max-w-xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a command or question..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <kbd className="text-[10px] text-slate-500 border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto scrollbar-thin py-2">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500 text-center">No results found.</p>
          ) : (
            items.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => execute(item)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === activeIndex ? "bg-sky-500/10" : "hover:bg-white/5"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${i === activeIndex ? "text-sky-400" : "text-slate-500"}`} />
                  <span className={`text-sm ${i === activeIndex ? "text-sky-200" : "text-slate-300"}`}>{item.label}</span>
                  {i === activeIndex && <CornerDownLeft className="h-3.5 w-3.5 text-slate-500 ml-auto" />}
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
