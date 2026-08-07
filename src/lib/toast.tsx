import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, ShieldAlert, Copy, Download, X } from "lucide-react";

type ToastType = "success" | "error" | "blocked" | "copied" | "export";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  blocked: ShieldAlert,
  copied: Copy,
  export: Download,
};

const COLORS: Record<ToastType, string> = {
  success: "text-emerald-400 border-emerald-500/30",
  error: "text-rose-400 border-rose-500/30",
  blocked: "text-amber-400 border-amber-500/30",
  copied: "text-sky-400 border-sky-500/30",
  export: "text-violet-400 border-violet-500/30",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 rounded-xl border bg-slate-900/90 backdrop-blur-xl px-4 py-3 shadow-2xl ${COLORS[t.type]}`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-sm text-slate-100">{t.message}</span>
              <button onClick={() => remove(t.id)} className="text-slate-500 hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
