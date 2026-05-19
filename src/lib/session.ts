const SESSION_KEY = "tpm_agent_session_id";
const CONSOLE_SESSION_KEY = "tpm_console_chat_session_id";

export function getStoredSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function setStoredSessionId(sessionId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, sessionId);
}

export function clearStoredSessionId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function generateSessionId(agentId: string): string {
  const suffix = Math.random().toString(36).slice(2, 14);
  return `${agentId}-${suffix}`;
}

export function getStoredConsoleSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CONSOLE_SESSION_KEY);
}

export function setStoredConsoleSessionId(sessionId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSOLE_SESSION_KEY, sessionId);
}

export function clearStoredConsoleSessionId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CONSOLE_SESSION_KEY);
}
