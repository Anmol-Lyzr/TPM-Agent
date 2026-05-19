"use client";

import { useEffect, useState } from "react";
import { fetchSession } from "@/lib/sessionStore";
import { getStoredSessionId } from "@/lib/session";
import type { MeetingMinutesPayload } from "@/types/meetingPayload";

/** Load session id + persisted payload from MongoDB (client-only). */
export function useStoredSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [payload, setPayload] = useState<MeetingMinutesPayload | null>(null);
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
        if (saved?.payload) {
          setPayload(saved.payload);
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

  return { sessionId, payload, hasStoredOutput, ready, setSessionId, setPayload };
}
