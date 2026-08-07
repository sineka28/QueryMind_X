import { motion } from "framer-motion";
import { Brain, Plus, History, Star, Database, Trash2, Settings, BarChart3, X, Network, LayoutDashboard, Target, Activity, Search, ShieldAlert, Presentation, FileText } from "lucide-react";
import type { HistoryItem } from "@/lib/types";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  history: HistoryItem[];
  favorites: HistoryItem[];
  onSelectHistory: (item: HistoryItem) => void;
  onDeleteHistory: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onExplainSchema: () => void;
  onOpenSchemaExplorer: () => void;
  onGenerateDashboard: () => void;
  onClearHistory: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
  onOpenCopilot: () => void;
  onOpenMission: () => void;
  onOpenSimulator: () => void;
  onOpenDetective: () => void;
  onOpenMeeting: () => void;
  onOpenPresentation: () => void;
  search: string;
  onSearch: (q: string) => void;
}

export function Sidebar(props: SidebarProps) {
  const {
    open, onClose, onNewChat, history, favorites,
    onSelectHistory, onDeleteHistory, onToggleFavorite,
    onExplainSchema, onOpenSchemaExplorer, onGenerateDashboard, onClearHistory, onOpenSettings, onOpenStats,
    onOpenCopilot, onOpenMission, onOpenSimulator, onOpenDetective, onOpenMeeting, onOpenPresentation,
    search, onSearch,
  } = props;

  const filtered = history.filter(h => h.question.toLowerCase().includes(search.toLowerCase()));

  const navItems = [
    { icon: LayoutDashboard, label: "Command Center", color: "text-sky-400", onClick: onOpenCopilot },
    { icon: BarChart3, label: "Dashboard Stats", color: "text-blue-400", onClick: onOpenStats },
    { icon: LayoutDashboard, label: "AI Dashboard Generator", color: "text-emerald-400", onClick: onGenerateDashboard },
    { icon: Target, label: "Mission Mode", color: "text-emerald-400", onClick: onOpenMission },
    { icon: Activity, label: "Decision Simulator", color: "text-sky-400", onClick: onOpenSimulator },
    { icon: ShieldAlert, label: "Data Detective", color: "text-amber-400", onClick: onOpenDetective },
    { icon: FileText, label: "Meeting Mode", color: "text-violet-400", onClick: onOpenMeeting },
    { icon: Presentation, label: "Presentation", color: "text-rose-400", onClick: onOpenPresentation },
    { icon: Network, label: "Schema Explorer", color: "text-violet-400", onClick: onOpenSchemaExplorer },
    { icon: Database, label: "Explain Schema", color: "text-violet-400", onClick: onExplainSchema },
  ];

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm" onClick={onClose} />}
      <aside className={`fixed lg:static top-0 left-0 h-full w-72 z-40 flex flex-col glass border-r border-white/5 transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg shadow-blue-500/20">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold gradient-text leading-tight">QueryMind X</h1>
              <p className="text-[10px] text-slate-500 leading-tight">AI BI Operating System</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-200"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-3 pb-3">
          <button onClick={onNewChat} className="w-full flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500/90 to-violet-600/90 hover:from-sky-500 hover:to-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all">
            <Plus className="h-4 w-4" /> New Chat
          </button>
        </div>

        <div className="px-3 pb-2 space-y-0.5">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <button key={i} onClick={item.onClick} className="w-full flex items-center gap-2.5 rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors">
                <Icon className={`h-4 w-4 ${item.color}`} /> {item.label}
              </button>
            );
          })}
        </div>

        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input type="text" value={search} onChange={e => onSearch(e.target.value)} placeholder="Search history..." className="w-full rounded-lg bg-white/5 border border-white/10 pl-8 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3 space-y-4">
          {favorites.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400/80"><Star className="h-3 w-3" /> Favorites</p>
              <div className="space-y-0.5">{favorites.map(item => <HistoryRow key={item.id} item={item} onSelect={onSelectHistory} onDelete={onDeleteHistory} onToggleFavorite={onToggleFavorite} />)}</div>
            </div>
          )}
          <div>
            <p className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500"><History className="h-3 w-3" /> History</p>
            {filtered.length === 0 ? <p className="px-3 py-4 text-xs text-slate-600 text-center">{search ? "No matches found." : "No queries yet."}</p> : <div className="space-y-0.5">{filtered.map(item => <HistoryRow key={item.id} item={item} onSelect={onSelectHistory} onDelete={onDeleteHistory} onToggleFavorite={onToggleFavorite} />)}</div>}
          </div>
        </div>

        <div className="border-t border-white/5 p-3 space-y-0.5">
          <button onClick={onClearHistory} className="w-full flex items-center gap-2.5 rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"><Trash2 className="h-4 w-4 text-rose-400" /> Clear History</button>
          <button onClick={onOpenSettings} className="w-full flex items-center gap-2.5 rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"><Settings className="h-4 w-4 text-slate-400" /> Settings</button>
        </div>
      </aside>
    </>
  );
}

function HistoryRow({ item, onSelect, onDelete, onToggleFavorite }: { item: HistoryItem; onSelect: (i: HistoryItem) => void; onDelete: (id: string) => void; onToggleFavorite: (id: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="group flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => onSelect(item)}>
      <span className="flex-1 truncate text-sm text-slate-300">{item.question}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={e => { e.stopPropagation(); onToggleFavorite(item.id); }} className="p-1 rounded hover:bg-white/10" aria-label="Toggle favorite"><Star className={`h-3.5 w-3.5 ${item.favorite ? "fill-amber-400 text-amber-400" : "text-slate-500"}`} /></button>
        <button onClick={e => { e.stopPropagation(); onDelete(item.id); }} className="p-1 rounded hover:bg-white/10" aria-label="Delete"><Trash2 className="h-3.5 w-3.5 text-slate-500 hover:text-rose-400" /></button>
      </div>
    </motion.div>
  );
}
