import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Target, Activity, Search, Brain, Presentation, FileText } from "lucide-react";

interface FloatingAssistantProps {
  onOpenSimulator: () => void;
  onOpenMission: () => void;
  onOpenDetective: () => void;
  onOpenMeeting: () => void;
  onOpenPresentation: () => void;
  onOpenSchemaExplorer: () => void;
  onAsk: (q: string) => void;
}

const ACTIONS = [
  { icon: Target, label: "Mission Mode", action: "mission" },
  { icon: Activity, label: "Decision Simulator", action: "simulator" },
  { icon: Search, label: "Data Detective", action: "detective" },
  { icon: Brain, label: "Meeting Mode", action: "meeting" },
  { icon: Presentation, label: "Presentation", action: "presentation" },
  { icon: FileText, label: "Schema Explorer", action: "schema" },
  { icon: Sparkles, label: "Dashboard Generator", action: "dashboard" },
];

export function FloatingAssistant(props: FloatingAssistantProps) {
  const [open, setOpen] = useState(false);

  const handleAction = (action: string) => {
    if (action === "mission") props.onOpenMission();
    else if (action === "simulator") props.onOpenSimulator();
    else if (action === "detective") props.onOpenDetective();
    else if (action === "meeting") props.onOpenMeeting();
    else if (action === "presentation") props.onOpenPresentation();
    else if (action === "schema") props.onOpenSchemaExplorer();
    else if (action === "dashboard") props.onAsk("Create a Sales Dashboard");
    setOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="glass-card p-2 mb-3 w-56"
          >
            <div className="flex items-center justify-between px-2 py-1.5 mb-1">
              <span className="text-xs font-semibold text-slate-300">AI Tools</span>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-0.5">
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.action}
                    onClick={() => handleAction(a.action)}
                    className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    <Icon className="h-4 w-4 text-sky-400" />
                    {a.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-600 shadow-2xl shadow-blue-500/30"
        aria-label="AI Assistant"
      >
        {!open && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-sky-400/40"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-6 w-6 text-white" />
            </motion.div>
          ) : (
            <motion.div key="sparkles" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Sparkles className="h-6 w-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
