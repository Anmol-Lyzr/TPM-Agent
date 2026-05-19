"use client";

import { useEffect, useState } from "react";
import type { DashboardAnalytics } from "@/lib/analytics";
import { fetchDashboardAnalytics } from "@/lib/sessionStore";

const emptyAnalytics: DashboardAnalytics = {
  overallProjects: 0,
  completedProjects: 0,
  totalBugs: 0,
  totalSessions: 0,
};

/** Load cross-session dashboard analytics from MongoDB (client-only). */
export function useDashboardAnalytics() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics>(emptyAnalytics);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchDashboardAnalytics()
      .then((data) => {
        if (!cancelled) {
          setAnalytics(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setAnalytics(emptyAnalytics);
          setError(err instanceof Error ? err.message : "Failed to load analytics");
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { analytics, ready, error };
}
