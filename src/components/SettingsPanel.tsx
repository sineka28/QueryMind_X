import { motion } from "framer-motion";
import { X, Sun, Moon, Monitor, Rows3, Sparkles, Trash2 } from "lucide-react";
import type { ThemeMode } from "@/lib/theme";

interface SettingsPanelProps {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  rowsPerPage: number;
  setRowsPerPage: (n: number) => void;
  animationsEnabled: boolean;
  setAnimationsEnabled: (b: boolean) => void;
  onClearSession: () => void;
  onClose: () => void;
}

export function SettingsPanel(props: SettingsPanelProps) {
  const { mode, setMode, rowsPerPage, setRowsPerPage, animationsEnabled, setAnimationsEnabled, onClearSession, onClose } = props;

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
        className="glass-card w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold gradient-text">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Theme */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { val: "light", icon: Sun, label: "Light" },
                { val: "dark", icon: Moon, label: "Dark" },
                { val: "system", icon: Monitor, label: "System" },
              ] as const).map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.val}
                    onClick={() => setMode(opt.val)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-2.5 transition-colors ${
                      mode === opt.val
                        ? "bg-sky-500/15 border-sky-500/40 text-sky-300"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rows per page */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Rows3 className="h-3.5 w-3.5" /> Rows Per Page
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 25, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => setRowsPerPage(n)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    rowsPerPage === n
                      ? "bg-sky-500/15 border-sky-500/40 text-sky-300"
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Animations */}
          <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <span className="text-sm text-slate-300">Animations</span>
            </div>
            <button
              onClick={() => setAnimationsEnabled(!animationsEnabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${animationsEnabled ? "bg-sky-500" : "bg-slate-600"}`}
              aria-label="Toggle animations"
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${animationsEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Clear session */}
          <button
            onClick={() => { onClearSession(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-sm text-rose-300 hover:bg-rose-500/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Clear Session
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
