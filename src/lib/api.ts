import { EDGE_FUNCTION_URL, authHeaders } from "./supabase";
import type {
  ChatResult, SchemaInfo, SchemaExplanation, Stats, DashboardConfig,
  CopilotData, DecisionSimulation, Mission, DetectiveResult, MeetingReport, Presentation,
} from "./types";

export type HealthStatus = "connected" | "connecting" | "disconnected";

export interface HealthResult {
  status: HealthStatus;
  latency?: number;
  timestamp?: string;
  error?: string;
}

async function callApi<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${EDGE_FUNCTION_URL}${path}`, {
    headers: authHeaders(),
    ...options,
  });
  if (!resp.ok) {
    let msg = `Request failed (${resp.status})`;
    try {
      const body = await resp.json();
      if (body?.error) msg = body.error;
    } catch {
      // ignore parse failure
    }
    throw new Error(msg);
  }
  return resp.json() as Promise<T>;
}

export async function checkHealth(): Promise<HealthResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(`${EDGE_FUNCTION_URL}/health`, {
      headers: authHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      return { status: "disconnected", error: body?.error ?? `HTTP ${resp.status}` };
    }
    const data = await resp.json();
    return { status: "connected", latency: data.latency, timestamp: data.timestamp };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { status: "disconnected", error: "Health check timed out" };
    }
    return { status: "disconnected", error: err instanceof Error ? err.message : "Network error" };
  }
}

export async function sendChat(question: string, history: { role: string; content: string }[]): Promise<ChatResult> {
  return callApi<ChatResult>("/chat", {
    method: "POST",
    body: JSON.stringify({ question, history }),
  });
}

export async function fetchSchema(): Promise<SchemaInfo> {
  return callApi<SchemaInfo>("/schema");
}

export async function explainSchema(): Promise<SchemaExplanation> {
  return callApi<SchemaExplanation>("/explain-schema");
}

export async function fetchStats(): Promise<Stats> {
  return callApi<Stats>("/stats");
}

export async function generateDashboard(prompt: string): Promise<DashboardConfig> {
  return callApi<DashboardConfig>("/dashboard", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export async function fetchCopilot(): Promise<CopilotData> {
  return callApi<CopilotData>("/copilot");
}

export async function simulateDecision(scenario: string): Promise<DecisionSimulation> {
  return callApi<DecisionSimulation>("/decision-simulator", {
    method: "POST",
    body: JSON.stringify({ scenario }),
  });
}

export async function startMission(goal: string): Promise<Mission> {
  return callApi<Mission>("/mission", {
    method: "POST",
    body: JSON.stringify({ goal }),
  });
}

export async function runDataDetective(): Promise<DetectiveResult> {
  return callApi<DetectiveResult>("/data-detective");
}

export async function prepareMeeting(): Promise<MeetingReport> {
  return callApi<MeetingReport>("/meeting");
}

export async function generatePresentation(): Promise<Presentation> {
  return callApi<Presentation>("/presentation");
}
