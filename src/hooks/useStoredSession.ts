"use client";

import { useEffect, useState } from "react";
import { emptyParsed } from "@/lib/constants";
import { fetchSession } from "@/lib/sessionStore";
import { getStoredSessionId } from "@/lib/session";
import type { ParsedAgentResponse } from "@/types/tpm";

/** Load session id + persisted parsed output from MongoDB (client-only). */
export function useStoredSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedAgentResponse>(emptyParsed);
  const [hasStoredOutput, setHasStoredOutput] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sid = getStoredSessionId();
    setSessionId(sid);
    if (!sid) {
      setReady(true);
      return;
    }

    let cancelled = false;
    fetchSession(sid)
      .then((saved) => {
        if (cancelled) return;
        if (saved?.parsed) {
          setParsed(saved.parsed);
          setHasStoredOutput(true);
        }
      })
      .catch(() => {
        /* dashboard shows empty state on load failure */
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { sessionId, parsed, hasStoredOutput, ready, setSessionId, setParsed };
}
