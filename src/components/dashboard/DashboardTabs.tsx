"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { EditToolbar } from "@/components/dashboard/EditToolbar";
import { RefinePromptBar } from "@/components/dashboard/RefinePromptBar";
import { PanelExportActions } from "@/components/ui/PanelExportActions";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { ProjectPlanTable } from "@/components/panels/ProjectPlanTable";
import { IssueTracker } from "@/components/panels/IssueTracker";
import { TaskTracker } from "@/components/panels/TaskTracker";
import { MeetingMinutes } from "@/components/panels/MeetingMinutes";
import {
  DASHBOARD_TABS,
  applyIssuesSave,
  applyMomSave,
  applyProjectPlanSave,
  applyTasksSave,
  cloneParsed,
  getTabSnapshot,
  persistParsed,
} from "@/lib/dashboardState";
import {
  canExportIssues,
  canExportMinutes,
  canExportProjectPlan,
  canExportTasks,
  exportIssueTrackerDocument,
  exportIssueTrackerExcel,
  exportMeetingMinutesDocument,
  exportMeetingMinutesExcel,
  exportProjectPlanDocument,
  exportProjectPlanExcel,
  exportTaskTrackerDocument,
  exportTaskTrackerExcel,
} from "@/lib/panelExports";
import type {
  DashboardTabId,
  JiraIssueRow,
  MeetingMinutes as MoMType,
  ParsedAgentResponse,
  ProjectPlanRow,
  TaskRow,
} from "@/types/tpm";

type TabDraft =
  | { tab: "plan"; data: ProjectPlanRow[] }
  | { tab: "issues"; data: JiraIssueRow[] }
  | { tab: "tasks"; data: TaskRow[] }
  | { tab: "mom"; data: MoMType };

function tabIsEmpty(parsed: ParsedAgentResponse, tab: DashboardTabId): boolean {
  switch (tab) {
    case "plan":
      return (
        parsed.projectPlan.length === 0 && !parsed.sections.smartsheet
      );
    case "issues":
      return parsed.issues.length === 0 && !parsed.sections.jira;
    case "tasks":
      return parsed.tasks.length === 0 && !parsed.sections.smartsheet;
    case "mom":
      return (
        !parsed.meetingMinutes.rawBody &&
        !parsed.confluenceLink &&
        !parsed.meetingMinutes.confluenceLink &&
        !parsed.meetingMinutes.title &&
        !parsed.meetingMinutes.summary
      );
  }
}

export function DashboardTabs({
  parsed,
  onParsedChange,
  sessionId,
  isLoading,
  hasRun,
  showEmpty,
  onRefine,
}: {
  parsed: ParsedAgentResponse;
  onParsedChange: (next: ParsedAgentResponse) => void;
  sessionId: string | null;
  isLoading: boolean;
  hasRun: boolean;
  showEmpty: boolean;
  onRefine: (prompt: string, activeTab: DashboardTabId) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<DashboardTabId>("plan");
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [draft, setDraft] = useState<TabDraft | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  const resetEdit = useCallback(() => {
    setIsEditing(false);
    setIsDirty(false);
    setDraft(null);
  }, []);

  useEffect(() => {
    resetEdit();
  }, [parsed, activeTab, resetEdit]);

  const activeEmpty = showEmpty || tabIsEmpty(parsed, activeTab);
  const canEdit = hasRun && !activeEmpty && !isLoading;

  const handleEdit = () => {
    switch (activeTab) {
      case "plan":
        setDraft({
          tab: "plan",
          data: cloneParsed(parsed).projectPlan,
        });
        break;
      case "issues":
        setDraft({
          tab: "issues",
          data: cloneParsed(parsed).issues,
        });
        break;
      case "tasks":
        setDraft({
          tab: "tasks",
          data: cloneParsed(parsed).tasks,
        });
        break;
      case "mom":
        setDraft({
          tab: "mom",
          data: cloneParsed(parsed).meetingMinutes,
        });
        break;
    }
    setIsEditing(true);
    setIsDirty(false);
  };

  const handleCancel = () => {
    resetEdit();
  };

  const handleSave = () => {
    if (!draft || draft.tab !== activeTab) return;
    let next: ParsedAgentResponse;
    switch (draft.tab) {
      case "plan":
        next = applyProjectPlanSave(parsed, draft.data);
        break;
      case "issues":
        next = applyIssuesSave(parsed, draft.data);
        break;
      case "tasks":
        next = applyTasksSave(parsed, draft.data);
        break;
      case "mom":
        next = applyMomSave(parsed, draft.data);
        break;
    }
    onParsedChange(next);
    if (sessionId) persistParsed(sessionId, next);
    resetEdit();
  };

  const handleRefineApply = async () => {
    const prompt = refinePrompt.trim();
    if (!prompt) return;
    await onRefine(prompt, activeTab);
    setRefinePrompt("");
    resetEdit();
  };

  const exportActions = useMemo(() => {
    const disabled = activeEmpty || isLoading;
    switch (activeTab) {
      case "plan":
        return (
          <PanelExportActions
            disabled={
              disabled ||
              !canExportProjectPlan(
                parsed.projectPlan,
                parsed.sections.smartsheet
              )
            }
            onExportExcel={() =>
              exportProjectPlanExcel(
                parsed.projectPlan,
                parsed.sections.smartsheet
              )
            }
            onExportDocument={() =>
              exportProjectPlanDocument(
                parsed.projectPlan,
                parsed.sections.smartsheet
              )
            }
          />
        );
      case "issues":
        return (
          <PanelExportActions
            disabled={
              disabled ||
              !canExportIssues(parsed.issues, parsed.sections.jira)
            }
            onExportExcel={() =>
              exportIssueTrackerExcel(parsed.issues, parsed.sections.jira)
            }
            onExportDocument={() =>
              exportIssueTrackerDocument(parsed.issues, parsed.sections.jira)
            }
          />
        );
      case "tasks":
        return (
          <PanelExportActions
            disabled={
              disabled ||
              !canExportTasks(parsed.tasks, parsed.sections.smartsheet)
            }
            onExportExcel={() =>
              exportTaskTrackerExcel(parsed.tasks, parsed.sections.smartsheet)
            }
            onExportDocument={() =>
              exportTaskTrackerDocument(parsed.tasks, parsed.sections.smartsheet)
            }
          />
        );
      case "mom":
        return (
          <PanelExportActions
            disabled={disabled || !canExportMinutes(parsed.meetingMinutes)}
            onExportExcel={() =>
              exportMeetingMinutesExcel(parsed.meetingMinutes)
            }
            onExportDocument={() =>
              exportMeetingMinutesDocument(parsed.meetingMinutes)
            }
          />
        );
    }
  }, [activeTab, activeEmpty, isLoading, parsed]);

  const planRows =
    isEditing && draft?.tab === "plan" ? draft.data : parsed.projectPlan;
  const issues =
    isEditing && draft?.tab === "issues" ? draft.data : parsed.issues;
  const tasks =
    isEditing && draft?.tab === "tasks" ? draft.data : parsed.tasks;
  const minutes =
    isEditing && draft?.tab === "mom" ? draft.data : parsed.meetingMinutes;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={DASHBOARD_TABS}
          active={activeTab}
          onChange={(key) => setActiveTab(key as DashboardTabId)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <EditToolbar
            isEditing={isEditing}
            isDirty={isDirty}
            canEdit={canEdit}
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
          />
          {exportActions}
        </div>
      </div>

      {hasRun && !isLoading ? (
        <RefinePromptBar
          value={refinePrompt}
          onChange={setRefinePrompt}
          onApply={handleRefineApply}
          isLoading={isLoading}
          disabled={!sessionId}
        />
      ) : null}

      <article className="panel-card relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {isLoading ? <LoadingOverlay /> : null}

          {activeTab === "plan" ? (
            <ProjectPlanTable
              embedded
              rows={planRows}
              sectionMarkdown={parsed.sections.smartsheet}
              isEditing={isEditing && draft?.tab === "plan"}
              isEmpty={activeEmpty}
              onDraftChange={(rows) => {
                setDraft({ tab: "plan", data: rows });
                setIsDirty(true);
              }}
            />
          ) : null}

          {activeTab === "issues" ? (
            <IssueTracker
              embedded
              issues={issues}
              sectionMarkdown={parsed.sections.jira}
              isEditing={isEditing && draft?.tab === "issues"}
              isEmpty={activeEmpty}
              onDraftChange={(data) => {
                setDraft({ tab: "issues", data });
                setIsDirty(true);
              }}
            />
          ) : null}

          {activeTab === "tasks" ? (
            <TaskTracker
              embedded
              tasks={tasks}
              sectionMarkdown={parsed.sections.smartsheet}
              isEditing={isEditing && draft?.tab === "tasks"}
              isEmpty={activeEmpty}
              onDraftChange={(data) => {
                setDraft({ tab: "tasks", data });
                setIsDirty(true);
              }}
            />
          ) : null}

          {activeTab === "mom" ? (
            <MeetingMinutes
              embedded
              minutes={minutes}
              isEditing={isEditing && draft?.tab === "mom"}
              isEmpty={activeEmpty}
              onDraftChange={(data) => {
                setDraft({ tab: "mom", data });
                setIsDirty(true);
              }}
            />
          ) : null}
        </div>
      </article>
    </div>
  );
}
