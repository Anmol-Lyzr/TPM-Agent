"use client";

import * as XLSX from "xlsx";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ShadingType,
} from "docx";
import type {
  ProjectPlanPayload,
  IssueTrackerEntry,
  RaidLogPayload,
  MinutesOfMeeting,
  MeetingMetadata,
} from "@/types/meetingPayload";

// ─── helpers ──────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeFilename(title: string | undefined, suffix: string): string {
  const base = (title ?? "Report").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
  return `${base}_${suffix}`;
}

function writeExcel(wb: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  triggerDownload(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}

/** Apply column widths to a worksheet */
function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map((w) => ({ wch: w }));
}

// ─── Project Plan → Excel ─────────────────────────────────────────────────────

export function downloadProjectPlanExcel(plan: ProjectPlanPayload, projectTitle?: string) {
  const header = [
    "ID",
    "Task Name",
    "Description",
    "Owner",
    "Start Date",
    "End Date",
    "Duration (Days)",
    "Dependencies",
    "Status",
    "Comments",
  ];

  const rows: (string | number)[][] = [];

  // Project summary row
  rows.push([
    "—",
    projectTitle?.trim() || "Project",
    "—",
    "—",
    "—",
    "—",
    plan.project_timeline_duration > 0 ? plan.project_timeline_duration : "—",
    "—",
    "—",
    "—",
  ]);

  for (const milestone of plan.milestones ?? []) {
    // Compute aggregate duration from tasks
    let totalDuration = milestone.milestone_timeline_duration ?? 0;
    for (const t of milestone.tasks ?? []) totalDuration += t.duration_days ?? 0;
    if (totalDuration === 0 && milestone.milestone_timeline_duration)
      totalDuration = milestone.milestone_timeline_duration;

    // Milestone row
    rows.push([
      milestone.milestone_id || "—",
      milestone.title || "—",
      "—",
      milestone.owner || "—",
      milestone.start_date || "—",
      milestone.end_date || "—",
      totalDuration || "—",
      milestone.dependencies?.join(", ") || "—",
      milestone.status || "—",
      "—",
    ]);

    // Task rows
    for (const task of milestone.tasks ?? []) {
      rows.push([
        task.task_id || "—",
        task.title || "—",
        task.description || "—",
        task.owner || "—",
        task.start_date || "—",
        task.end_date || "—",
        task.duration_days ?? "—",
        task.dependency_ids?.join(", ") || "—",
        task.status || "—",
        task.comments || "—",
      ]);
    }
  }

  const data = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  setColWidths(ws, [12, 28, 36, 16, 14, 14, 16, 22, 16, 28]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Project Plan");
  writeExcel(wb, safeFilename(projectTitle, "Project_Plan.xlsx"));
}

// ─── Issue Tracker → Excel ────────────────────────────────────────────────────

export function downloadIssueTrackerExcel(issues: IssueTrackerEntry[], projectTitle?: string) {
  const header = [
    "Key",
    "Type",
    "Summary",
    "Description",
    "Status",
    "Assignee",
    "Reporter",
    "Due Date",
    "Priority",
    "Severity",
    "Sprint",
    "Epic",
    "Story Points",
    "Labels",
    "Blocked By",
    "Module",
    "Impact",
  ];

  const rows = issues.map((issue) => [
    issue.issue_key || "—",
    issue.issue_type || "—",
    issue.summary || "—",
    issue.description || "—",
    issue.status || "—",
    issue.assignee || "—",
    issue.reporter || "—",
    issue.due_date || "—",
    issue.priority || "—",
    issue.severity || "—",
    issue.sprint || "—",
    issue.epic || "—",
    issue.story_points ?? "—",
    issue.labels?.join(", ") || "—",
    issue.blocked_by?.join(", ") || "—",
    issue.module || "—",
    issue.impact || "—",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  setColWidths(ws, [12, 10, 32, 40, 14, 16, 16, 14, 12, 12, 16, 16, 14, 20, 20, 16, 28]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Issue Tracker");
  writeExcel(wb, safeFilename(projectTitle, "Issue_Tracker.xlsx"));
}

// ─── RAID Log → Excel ─────────────────────────────────────────────────────────

export function downloadRaidLogExcel(raid: RaidLogPayload, projectTitle?: string) {
  const header = [
    "Type",
    "ID",
    "Description",
    "Owner",
    "Impact",
    "Probability",
    "Status",
    "Mitigation / Resolution",
    "Date",
  ];

  const rows: (string | number)[][] = [];

  for (const r of raid.risks ?? []) {
    rows.push([
      "Risk",
      r.risk_id,
      r.description,
      r.owner,
      r.impact,
      r.probability,
      r.status,
      r.mitigation_strategy,
      r.identified_date,
    ]);
  }

  for (const a of raid.assumptions ?? []) {
    rows.push([
      "Assumption",
      a.assumption_id,
      a.description,
      a.owner,
      a.impact_if_invalid,
      "—",
      a.status,
      a.validation_approach,
      a.identified_date,
    ]);
  }

  for (const i of raid.issues ?? []) {
    rows.push([
      "Issue",
      i.issue_id,
      i.description,
      i.owner,
      i.impact,
      "—",
      i.status,
      i.resolution_path,
      i.identified_date,
    ]);
  }

  for (const d of raid.dependencies ?? []) {
    rows.push([
      "Dependency",
      d.dependency_id,
      d.description,
      d.owner,
      d.impact_if_delayed,
      "—",
      d.status,
      "—",
      d.expected_resolution_date,
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  setColWidths(ws, [14, 14, 44, 16, 32, 14, 16, 40, 16]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "RAID Log");
  writeExcel(wb, safeFilename(projectTitle, "RAID_Log.xlsx"));
}

// ─── Minutes of Meeting → DOCX ────────────────────────────────────────────────

const HEADER_COLOR = "2563EB"; // blue-600
const TABLE_HEADER_COLOR = "EFF6FF"; // blue-50

function boldRun(text: string, size = 22) {
  return new TextRun({ text, bold: true, size });
}

function normalRun(text: string, size = 20) {
  return new TextRun({ text, size });
}

function sectionHeading(text: string) {
  return new Paragraph({
    children: [boldRun(text, 22)],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1", space: 4 } },
  });
}

function tableHeaderCell(text: string) {
  return new TableCell({
    children: [new Paragraph({ children: [boldRun(text, 18)], alignment: AlignmentType.LEFT })],
    shading: { type: ShadingType.SOLID, color: TABLE_HEADER_COLOR, fill: TABLE_HEADER_COLOR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
  });
}

function tableDataCell(text: string) {
  return new TableCell({
    children: [new Paragraph({ children: [normalRun(text || "—", 18)], alignment: AlignmentType.LEFT })],
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
  });
}

function makeTable(headers: string[], rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map((h) => tableHeaderCell(h)),
        tableHeader: true,
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((cell) => tableDataCell(cell)),
          })
      ),
    ],
  });
}

export async function downloadMomDocx(minutes: MinutesOfMeeting, metadata: MeetingMetadata | null, projectTitle?: string) {
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: metadata?.meeting_title || projectTitle || "Minutes of Meeting",
          bold: true,
          size: 36,
          color: HEADER_COLOR,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    })
  );

  // Metadata block
  const metaLines: [string, string][] = [
    ["Date", metadata?.date || "—"],
    ["Duration", metadata?.duration_minutes ? `${metadata.duration_minutes} minutes` : "—"],
    ["Sprint", metadata?.sprint || "—"],
    ["Platform", metadata?.platform || "—"],
  ];
  for (const [label, value] of metaLines) {
    children.push(
      new Paragraph({
        children: [boldRun(`${label}: `, 20), normalRun(value, 20)],
        spacing: { after: 60 },
      })
    );
  }

  children.push(new Paragraph({ children: [], spacing: { after: 160 } }));

  // Purpose
  if (minutes.purpose) {
    children.push(sectionHeading("Purpose"));
    children.push(
      new Paragraph({
        children: [normalRun(minutes.purpose, 20)],
        spacing: { after: 200 },
      })
    );
  }

  // Key Decisions
  if (minutes.key_decisions?.length > 0) {
    children.push(sectionHeading("Key Decisions"));
    children.push(
      makeTable(
        ["ID", "Decision", "Decided By"],
        minutes.key_decisions.map((d) => [d.decision_id, d.decision, d.decided_by || "—"])
      )
    );
    children.push(new Paragraph({ children: [], spacing: { after: 160 } }));
  }

  // Action Items
  if (minutes.action_items?.length > 0) {
    children.push(sectionHeading("Action Items"));
    children.push(
      makeTable(
        ["ID", "Action", "Owner", "Due Date", "Status"],
        minutes.action_items.map((a) => [a.action_id, a.action, a.owner || "—", a.due_date || "—", a.status])
      )
    );
    children.push(new Paragraph({ children: [], spacing: { after: 160 } }));
  }

  // Discussion Highlights
  if (minutes.discussion_highlights?.length > 0) {
    children.push(sectionHeading("Discussion Highlights"));
    for (const h of minutes.discussion_highlights) {
      children.push(
        new Paragraph({
          children: [boldRun(`${h.topic}: `, 20), normalRun(h.summary, 20)],
          bullet: { level: 0 },
          spacing: { after: 80 },
        })
      );
    }
    children.push(new Paragraph({ children: [], spacing: { after: 160 } }));
  }

  // Risks & Dependencies
  if (minutes.risks_and_dependencies_summary?.length > 0) {
    children.push(sectionHeading("Risks & Dependencies"));
    for (const item of minutes.risks_and_dependencies_summary) {
      children.push(
        new Paragraph({
          children: [normalRun(item, 20)],
          bullet: { level: 0 },
          spacing: { after: 80 },
        })
      );
    }
    children.push(new Paragraph({ children: [], spacing: { after: 160 } }));
  }

  // Next Milestones
  if (minutes.next_milestones?.length > 0) {
    children.push(sectionHeading("Next Milestones"));
    children.push(
      makeTable(
        ["Milestone", "Target Date"],
        minutes.next_milestones.map((m) => [m.milestone, m.target_date || "—"])
      )
    );
    children.push(new Paragraph({ children: [], spacing: { after: 160 } }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  triggerDownload(buffer, safeFilename(metadata?.meeting_title || projectTitle, "Minutes_of_Meeting.docx"));
}
