import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, ShieldCheck, Wifi, Loader2, User as UserIcon, LogOut, ChevronDown, Settings, Command, Circle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { HealthStatus } from "@/lib/api";

interface TopBarProps {
  onMenuClick: () => void;
  health: HealthStatus;
  onOpenPalette?: () => void;
  onOpenSettings?: () => void;
  onOpenAuth?: () => void;
}

const HEALTH_CONFIG: Record<HealthStatus, { color: string; text: string; dotClass: string; icon?: typeof Loader2 }> = {
  connected: { color: "text-success-400", text: "Connected", dotClass: "bg-success-400" },
  connecting: { color: "text-warning-400", text: "Connecting", dotClass: "bg-warning-400", icon: Loader2 },
  disconnected: { color: "text-danger-400", text: "Disconnected", dotClass: "bg-danger-400" },
};

export function TopBar({ onMenuClick, health, onOpenPalette, onOpenSettings, onOpenAuth }: TopBarProps) {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const cfg = HEALTH_CONFIG[health];
  const HealthIcon = cfg.icon;

  const initials = user
    ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "";

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
  };

  return (
    <header className="flex items-center justify-between px-4 lg:px-6 py-3.5 border-b border-white/[0.04] glass-nav">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-xl hover:bg-white/5 text-slate-300 transition-colors" aria-label="Toggle sidebar">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-200">QueryMind X</span>
          <span className="hidden sm:inline text-xs text-slate-500 font-medium">/ Analytics Workspace</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Command palette trigger */}
        {onOpenPalette && (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={onOpenPalette}
            className="hidden sm:flex items-center gap-2 rounded-xl glass border border-white/[0.06] px-3 py-1.5 text-xs text-slate-400 hover:text-slate-300 hover:border-white/10 transition-colors"
            aria-label="Open command palette"
          >
            <Command className="h-3.5 w-3.5" />
            <span>Search...</span>
            <kbd className="ml-2 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500 font-mono">⌘K</kbd>
          </motion.button>
        )}

        {/* Read-only badge */}
        <div className="flex items-center gap-1.5 rounded-full bg-success-500/10 border border-success-500/20 px-2.5 py-1">
          <ShieldCheck className="h-3.5 w-3.5 text-success-400" />
          <span className="text-xs font-medium text-success-300 hidden sm:inline">Read-only</span>
        </div>

        {/* Real health status */}
        <div className="flex items-center gap-1.5 rounded-full glass border border-white/[0.06] px-2.5 py-1" title={`Database: ${cfg.text}`}>
          {HealthIcon ? (
            <HealthIcon className={`h-3.5 w-3.5 ${cfg.color} animate-spin`} />
          ) : (
            <span className={`h-2 w-2 rounded-full ${cfg.dotClass} ${health === "connected" ? "animate-pulse" : ""}`} />
          )}
          <span className={`text-xs font-medium hidden sm:inline ${cfg.color}`}>{cfg.text}</span>
        </div>

        {/* User profile / Sign in */}
        {user ? (
          <div className="relative" ref={menuRef}>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-2 rounded-full glass border border-white/[0.06] pl-1.5 pr-2.5 py-1 hover:border-white/10 transition-colors"
              aria-label="User menu"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-white text-xs font-bold">
                  {initials}
                </div>
              )}
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-xs font-semibold text-slate-200 max-w-[100px] truncate">{user.name}</span>
                <div className="flex items-center gap-1">
                  <Circle className="h-1.5 w-1.5 fill-success-400 text-success-400" />
                  <span className="text-[10px] text-slate-500">Online</span>
                </div>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-64 glass-card noise-texture p-2 z-50"
                >
                  {/* User info header */}
                  <div className="flex items-center gap-3 px-3 py-2.5 mb-1 border-b border-white/[0.04]">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-white text-sm font-bold">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Online status */}
                  <div className="flex items-center gap-2 px-3 py-2 mb-1">
                    <Circle className="h-2 w-2 fill-success-400 text-success-400" />
                    <span className="text-xs text-slate-400">Online</span>
                  </div>

                  {/* Menu items */}
                  <button
                    onClick={() => { onOpenSettings?.(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    <Settings className="h-4 w-4 text-slate-400" /> Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-danger-300 hover:bg-danger-500/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={onOpenAuth}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-primary-500/20 transition-all"
          >
            <UserIcon className="h-3.5 w-3.5" /> Sign In
          </motion.button>
        )}
      </div>
    </header>
  );
}
