"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CONSOLE_AGENT_ID } from "@/lib/constants";
import { postConsoleChat } from "@/lib/consoleClient";
import {
  clearStoredConsoleSessionId,
  generateSessionId,
  getStoredConsoleSessionId,
  setStoredConsoleSessionId,
} from "@/lib/session";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

function newMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useConsoleChat(meetingSessionId?: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const stored = getStoredConsoleSessionId();
    if (stored) setChatSessionId(stored);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setError(null);
      setInput("");
      setMessages((prev) => [
        ...prev,
        { id: newMessageId(), role: "user", content: trimmed },
      ]);
      setIsLoading(true);

      const sid =
        chatSessionId ??
        getStoredConsoleSessionId() ??
        generateSessionId(CONSOLE_AGENT_ID);

      abortRef.current = new AbortController();

      try {
        const data = await postConsoleChat({
          message: trimmed,
          session_id: sid,
          meeting_session_id: meetingSessionId ?? undefined,
        });

        setChatSessionId(data.session_id);
        setStoredConsoleSessionId(data.session_id);
        setMessages((prev) => [
          ...prev,
          { id: newMessageId(), role: "assistant", content: data.reply },
        ]);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to get a reply");
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [chatSessionId, isLoading, meetingSessionId]
  );

  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    clearStoredConsoleSessionId();
    setChatSessionId(null);
    setMessages([]);
    setError(null);
    setInput("");
    setIsLoading(false);
  }, []);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  return {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    error,
    chatSessionId,
    handleNewChat,
    handleStop,
  };
}
