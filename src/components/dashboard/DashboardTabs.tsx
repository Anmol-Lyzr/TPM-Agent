"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { ProjectPlanTable } from "@/components/panels/ProjectPlanTable";
import { IssueTracker } from "@/components/panels/IssueTracker";
import { RaidLogPanel } from "@/components/panels/RaidLogPanel";
import { MeetingMinutes } from "@/components/panels/MeetingMinutes";
import { DASHBOARD_TABS } from "@/lib/dashboardState";
import type { DashboardTabId } from "@/types/tpm";
import type { MeetingMinutesPayload } from "@/types/meetingPayload";

export function DashboardTabs({
  payload,
  isLoading,
  hasRun,
  showEmpty,
  sessionId,
  onRefine,
}: {
  payload: MeetingMinutesPayload | null;
  isLoading: boolean;
  hasRun: boolean;
  showEmpty: boolean;
  sessionId: string | null;
  onRefine?: (prompt: string, activeTab: DashboardTabId, snapshot: unknown) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<DashboardTabId>("plan");

  const isEmpty = showEmpty || !payload;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={DASHBOARD_TABS}
          active={activeTab}
          onChange={(key) => setActiveTab(key as DashboardTabId)}
        />
      </div>

      <article className="glass-card relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {isLoading ? <LoadingOverlay /> : null}

          {activeTab === "plan" ? (
            <ProjectPlanTable
              embedded
              plan={payload?.project_plan ?? null}
              projectTitle={payload?.metadata?.meeting_title}
              isLoading={isLoading}
              isEmpty={isEmpty}
            />
          ) : null}

          {activeTab === "issues" ? (
            <IssueTracker
              embedded
              issues={payload?.issue_tracker ?? []}
              isLoading={isLoading}
              isEmpty={isEmpty}
            />
          ) : null}

          {activeTab === "raid" ? (
            <RaidLogPanel
              embedded
              raid={payload?.raid_log ?? null}
              isLoading={isLoading}
              isEmpty={isEmpty}
            />
          ) : null}

          {activeTab === "mom" ? (
            <MeetingMinutes
              embedded
              minutes={payload?.minutes_of_meeting ?? null}
              metadata={payload?.metadata ?? null}
              isLoading={isLoading}
              isEmpty={isEmpty}
            />
          ) : null}
        </div>
      </article>
    </div>
  );
}
