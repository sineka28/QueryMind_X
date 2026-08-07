import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ToastProvider, useToast } from "@/lib/toast";
import { useTheme } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import { sendChat, checkHealth } from "@/lib/api";
import type { HealthStatus } from "@/lib/api";
import type { ChatMessage, HistoryItem, SavedDashboard } from "@/lib/types";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { ChatInput } from "@/components/ChatInput";
import { Welcome } from "@/components/Welcome";
import { MessageBubble } from "@/components/MessageBubble";
import { ParticleBackground } from "@/components/ParticleBackground";
import { AuroraBackground } from "@/components/AuroraBackground";
import { CommandPalette } from "@/components/CommandPalette";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { CopilotDashboard } from "@/components/CopilotDashboard";
import { AuthModal } from "@/components/AuthModal";

const StatsDashboard = lazy(() => import("@/components/StatsDashboard").then(m => ({ default: m.StatsDashboard })));
const SchemaExplainer = lazy(() => import("@/components/SchemaExplainer").then(m => ({ default: m.SchemaExplainer })));
const SettingsPanel = lazy(() => import("@/components/SettingsPanel").then(m => ({ default: m.SettingsPanel })));
const SchemaExplorer = lazy(() => import("@/components/SchemaExplorer").then(m => ({ default: m.SchemaExplorer })));
const DashboardView = lazy(() => import("@/components/DashboardView").then(m => ({ default: m.DashboardView })));
const DecisionSimulator = lazy(() => import("@/components/DecisionSimulator").then(m => ({ default: m.DecisionSimulator })));
const MissionMode = lazy(() => import("@/components/MissionMode").then(m => ({ default: m.MissionMode })));
const DataDetective = lazy(() => import("@/components/DataDetective").then(m => ({ default: m.DataDetective })));
const MeetingMode = lazy(() => import("@/components/MeetingMode").then(m => ({ default: m.MeetingMode })));
const PresentationGenerator = lazy(() => import("@/components/PresentationGenerator").then(m => ({ default: m.PresentationGenerator })));

const HISTORY_KEY = "querymind-history";
const SETTINGS_KEY = "querymind-settings";
const DASHBOARDS_KEY = "querymind-dashboards";

interface AppSettings { rowsPerPage: number; animationsEnabled: boolean; }

function loadHistory(): HistoryItem[] { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); } catch { return []; } }
function loadSettings(): AppSettings { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{"rowsPerPage":10,"animationsEnabled":true}'); } catch { return { rowsPerPage: 10, animationsEnabled: true }; } }
function loadDashboards(): SavedDashboard[] { try { return JSON.parse(localStorage.getItem(DASHBOARDS_KEY) ?? "[]"); } catch { return []; } }
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

type View = "chat" | "copilot";

function AppInner() {
  const { mode, setMode } = useTheme();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [dashboards, setDashboards] = useState<SavedDashboard[]>(loadDashboards);
  const [health, setHealth] = useState<HealthStatus>("connecting");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [view, setView] = useState<View>("copilot");

  const [showStats, setShowStats] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showSchemaExplorer, setShowSchemaExplorer] = useState(false);
  const [dashboardPrompt, setDashboardPrompt] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showMission, setShowMission] = useState(false);
  const [showDetective, setShowDetective] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [voiceSummary, setVoiceSummary] = useState<string | undefined>(undefined);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  useEffect(() => { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(DASHBOARDS_KEY, JSON.stringify(dashboards)); }, [dashboards]);

  // Real health check on mount + periodic re-check
  useEffect(() => {
    let active = true;
    const runCheck = async () => {
      setHealth("connecting");
      const result = await checkHealth();
      if (active) setHealth(result.status);
    };
    runCheck();
    const interval = setInterval(runCheck, 30000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setShowPalette(p => !p); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const favorites = history.filter(h => h.favorite);

  const addHistory = useCallback((question: string) => {
    setHistory(prev => [{ id: uid(), question, timestamp: Date.now(), favorite: false }, ...prev].slice(0, 100));
  }, []);

  const buildApiHistory = (msgs: ChatMessage[]) =>
    msgs.filter(m => !m.loading && !m.error).slice(-3).map(m => ({
      role: m.role,
      content: m.role === "assistant" && m.result ? m.result.sql : m.content,
    }));

  const handleSend = useCallback(async (question: string) => {
    if (loading || abortRef.current) return;
    abortRef.current = false;
    setLoading(true);
    setView("chat");

    const userMsg: ChatMessage = { id: uid(), role: "user", content: question, timestamp: Date.now() };
    const aiId = uid();
    const aiMsg: ChatMessage = { id: aiId, role: "assistant", content: "", timestamp: Date.now(), loading: true };
    const prevMessages = messages;

    setMessages(prev => [...prev, userMsg, aiMsg]);
    addHistory(question);

    try {
      const apiHistory = buildApiHistory(prevMessages);
      const result = await sendChat(question, apiHistory);
      if (abortRef.current) return;
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, loading: false, result, error: result.error } : m));
      if (result.blocked) { toast("blocked", `Blocked: ${result.blockedReason ?? "Read-only mode"}`); }
      else if (result.error) { toast("error", "Query failed — see details"); }
      else { toast("success", `Query succeeded · ${result.rowCount} rows in ${result.executionMs}ms`); if (result.analysis) setVoiceSummary(result.analysis.executiveSummary); }
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, loading: false, error: err instanceof Error ? err.message : "Network error" } : m));
      setHealth("disconnected");
      toast("error", "Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [loading, messages, addHistory, toast]);

  const handleStop = () => { abortRef.current = true; setLoading(false); setMessages(prev => prev.filter(m => !m.loading)); toast("error", "Query cancelled"); };
  const handleNewChat = () => { setMessages([]); setView("chat"); setSidebarOpen(false); };
  const handleSelectHistory = (item: HistoryItem) => { handleSend(item.question); setSidebarOpen(false); };
  const handleDeleteHistory = (id: string) => setHistory(prev => prev.filter(h => h.id !== id));
  const handleToggleFavorite = (id: string) => setHistory(prev => prev.map(h => h.id === id ? { ...h, favorite: !h.favorite } : h));
  const handleClearHistory = () => { setHistory([]); toast("success", "History cleared"); };
  const handleClearSession = () => { setMessages([]); setHistory([]); setView("copilot"); toast("success", "Session cleared"); };
  const handleGenerateDashboard = () => { setDashboardPrompt("Create a Sales Dashboard"); setSidebarOpen(false); };
  const handleSaveDashboard = (d: SavedDashboard) => setDashboards(prev => [d, ...prev].slice(0, 20));
  const openCopilot = () => { setView("copilot"); setSidebarOpen(false); };

  return (
    <div className="flex h-screen overflow-hidden">
      <AuroraBackground enabled={settings.animationsEnabled} />
      <ParticleBackground enabled={settings.animationsEnabled} />

      <Sidebar
        open={sidebarOpen} onClose={() => setSidebarOpen(false)} onNewChat={handleNewChat}
        history={history} favorites={favorites}
        onSelectHistory={handleSelectHistory} onDeleteHistory={handleDeleteHistory} onToggleFavorite={handleToggleFavorite}
        onExplainSchema={() => { setShowSchema(true); setSidebarOpen(false); }}
        onOpenSchemaExplorer={() => { setShowSchemaExplorer(true); setSidebarOpen(false); }}
        onGenerateDashboard={handleGenerateDashboard}
        onClearHistory={handleClearHistory}
        onOpenSettings={() => { setShowSettings(true); setSidebarOpen(false); }}
        onOpenStats={() => { setShowStats(true); setSidebarOpen(false); }}
        onOpenCopilot={openCopilot}
        onOpenMission={() => { setShowMission(true); setSidebarOpen(false); }}
        onOpenSimulator={() => { setShowSimulator(true); setSidebarOpen(false); }}
        onOpenDetective={() => { setShowDetective(true); setSidebarOpen(false); }}
        onOpenMeeting={() => { setShowMeeting(true); setSidebarOpen(false); }}
        onOpenPresentation={() => { setShowPresentation(true); setSidebarOpen(false); }}
        search={historySearch} onSearch={setHistorySearch}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          health={health}
          onOpenPalette={() => setShowPalette(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenAuth={() => setShowAuth(true)}
        />

        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-3xl px-4 lg:px-6">
            {view === "copilot" && messages.length === 0 ? (
              <CopilotDashboard
                onAsk={handleSend}
                onOpenMission={() => setShowMission(true)}
                onOpenSimulator={() => setShowSimulator(true)}
                onOpenDetective={() => setShowDetective(true)}
                onOpenMeeting={() => setShowMeeting(true)}
                onOpenPresentation={() => setShowPresentation(true)}
                onOpenDashboard={handleGenerateDashboard}
              />
            ) : messages.length === 0 ? (
              <Welcome onPick={handleSend} />
            ) : (
              <div className="py-4">
                <AnimatePresence initial={false}>
                  {messages.map(m => <MessageBubble key={m.id} message={m} onPickSuggestion={handleSend} rowsPerPage={settings.rowsPerPage} />)}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 lg:px-6 pb-3">
          <ChatInput onSend={handleSend} disabled={loading} onStop={handleStop} />
          <VoiceAssistant onTranscript={handleSend} summary={voiceSummary} />
        </div>
      </div>

      <FloatingAssistant
        onOpenSimulator={() => setShowSimulator(true)}
        onOpenMission={() => setShowMission(true)}
        onOpenDetective={() => setShowDetective(true)}
        onOpenMeeting={() => setShowMeeting(true)}
        onOpenPresentation={() => setShowPresentation(true)}
        onOpenSchemaExplorer={() => setShowSchemaExplorer(true)}
        onAsk={handleSend}
      />

      <AnimatePresence>
        {showStats && <Suspense fallback={null}><StatsDashboard onClose={() => setShowStats(false)} /></Suspense>}
        {showSchema && <Suspense fallback={null}><SchemaExplainer onClose={() => setShowSchema(false)} /></Suspense>}
        {showSettings && <Suspense fallback={null}><SettingsPanel mode={mode} setMode={setMode} rowsPerPage={settings.rowsPerPage} setRowsPerPage={n => setSettings(s => ({ ...s, rowsPerPage: n }))} animationsEnabled={settings.animationsEnabled} setAnimationsEnabled={b => setSettings(s => ({ ...s, animationsEnabled: b }))} onClearSession={handleClearSession} onClose={() => setShowSettings(false)} /></Suspense>}
        {showSchemaExplorer && <Suspense fallback={null}><SchemaExplorer onClose={() => setShowSchemaExplorer(false)} /></Suspense>}
        {dashboardPrompt && <Suspense fallback={null}><DashboardView prompt={dashboardPrompt} onClose={() => setDashboardPrompt(null)} onSave={handleSaveDashboard} /></Suspense>}
        {showSimulator && <Suspense fallback={null}><DecisionSimulator onClose={() => setShowSimulator(false)} onAsk={handleSend} /></Suspense>}
        {showMission && <Suspense fallback={null}><MissionMode onClose={() => setShowMission(false)} onAsk={handleSend} /></Suspense>}
        {showDetective && <Suspense fallback={null}><DataDetective onClose={() => setShowDetective(false)} /></Suspense>}
        {showMeeting && <Suspense fallback={null}><MeetingMode onClose={() => setShowMeeting(false)} /></Suspense>}
        {showPresentation && <Suspense fallback={null}><PresentationGenerator onClose={() => setShowPresentation(false)} /></Suspense>}
        {showAuth && <Suspense fallback={null}><AuthModal onClose={() => setShowAuth(false)} /></Suspense>}
      </AnimatePresence>

      <CommandPalette
        open={showPalette} onClose={() => setShowPalette(false)} onAsk={handleSend} onNewChat={handleNewChat}
        onOpenStats={() => { setShowStats(true); setShowPalette(false); }}
        onExplainSchema={() => { setShowSchema(true); setShowPalette(false); }}
        onOpenSettings={() => { setShowSettings(true); setShowPalette(false); }}
        onOpenSchemaExplorer={() => { setShowSchemaExplorer(true); setShowPalette(false); }}
        onGenerateDashboard={() => { handleGenerateDashboard(); setShowPalette(false); }}
        history={history}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
