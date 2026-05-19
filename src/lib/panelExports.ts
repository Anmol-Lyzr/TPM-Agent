import type {
  JiraIssueRow,
  MeetingMinutes,
  ProjectPlanRow,
  RaidLogRow,
} from "@/types/legacyTpm";
import {
  exportHtmlToWordDocument,
  exportRowsToExcel,
  markdownTableToRows,
  markdownToHtml,
  rowsToHtmlTable,
  datedFilename,
  type SheetRow,
} from "@/lib/export";
import {
  getPlanTaskDescription,
  getPlanTaskName,
  getPlanWbsId,
  getPlanDuration,
  PROJECT_PLAN_COLUMNS,
} from "@/lib/projectPlan";

function projectPlanToSheetRow(row: ProjectPlanRow): SheetRow {
  return {
    [PROJECT_PLAN_COLUMNS[0]]: getPlanWbsId(row),
    [PROJECT_PLAN_COLUMNS[1]]: getPlanTaskName(row),
    [PROJECT_PLAN_COLUMNS[2]]: getPlanTaskDescription(row),
    [PROJECT_PLAN_COLUMNS[3]]: row.owner,
    [PROJECT_PLAN_COLUMNS[4]]: row.start,
    [PROJECT_PLAN_COLUMNS[5]]: row.end,
    [PROJECT_PLAN_COLUMNS[6]]: getPlanDuration(row),
    [PROJECT_PLAN_COLUMNS[7]]: row.dependency,
    [PROJECT_PLAN_COLUMNS[8]]: row.status ?? "",
    [PROJECT_PLAN_COLUMNS[9]]: row.priority ?? "",
    [PROJECT_PLAN_COLUMNS[10]]: row.comments,
  };
}

function resolveExcelRows(
  structured: SheetRow[],
  markdownFallback?: string
): SheetRow[] {
  if (structured.length > 0) return structured;
  if (markdownFallback?.trim()) return markdownTableToRows(markdownFallback);
  return [];
}

function exportPanelExcel(
  excelRows: SheetRow[],
  excelBaseName: string,
  sheetName: string,
  markdownFallback?: string
): void {
  const rows = resolveExcelRows(excelRows, markdownFallback);
  if (rows.length > 0) {
    exportRowsToExcel(datedFilename(excelBaseName, "xlsx"), sheetName, rows);
  }
}

function exportPanelDocument(
  fileBaseName: string,
  docTitle: string,
  docHtml: string,
  markdownDocFallback?: string
): void {
  const html =
    docHtml || (markdownDocFallback ? markdownToHtml(markdownDocFallback) : "");
  if (html) {
    exportHtmlToWordDocument(
      datedFilename(fileBaseName, "doc"),
      docTitle,
      html
    );
  }
}

export function exportProjectPlanExcel(
  rows: ProjectPlanRow[],
  sectionMarkdown?: string
): void {
  exportPanelExcel(
    rows.map(projectPlanToSheetRow),
    "TPM-Project-Plan",
    "Project WBS",
    sectionMarkdown
  );
}

export function exportProjectPlanDocument(
  rows: ProjectPlanRow[],
  sectionMarkdown?: string
): void {
  const docHtml =
    rows.length > 0
      ? rowsToHtmlTable(
          [...PROJECT_PLAN_COLUMNS],
          rows.map((r) => {
            const sheet = projectPlanToSheetRow(r);
            return PROJECT_PLAN_COLUMNS.map(
              (col) => String(sheet[col] ?? "")
            );
          })
        )
      : "";
  exportPanelDocument(
    "TPM-Project-Plan",
    "Project Plan — Smartsheet WBS",
    docHtml,
    sectionMarkdown
  );
}

export function exportIssueTrackerExcel(
  issues: JiraIssueRow[],
  sectionMarkdown?: string
): void {
  exportPanelExcel(
    issues.map((i) => ({
      Key: i.key.startsWith("NEW-") ? "" : i.key,
      Summary: i.summary,
      Status: i.status ?? i.action,
      "Issue Type": i.issueType ?? "",
      Assignee: i.assignee ?? "",
      "Due Date": i.dueDate ?? "",
      Priority: i.priority ?? "",
    })),
    "TPM-Issue-Tracker",
    "JIRA Issues",
    sectionMarkdown
  );
}

export function exportIssueTrackerDocument(
  issues: JiraIssueRow[],
  sectionMarkdown?: string
): void {
  const docHtml =
    issues.length > 0
      ? rowsToHtmlTable(
          ["Key", "Summary", "Status", "Assignee", "Due Date", "Priority"],
          issues.map((i) => [
            i.key.startsWith("NEW-") ? "—" : i.key,
            i.summary,
            i.status ?? i.action,
            i.assignee ?? "",
            i.dueDate ?? "",
            i.priority ?? "",
          ])
        )
      : "";
  exportPanelDocument(
    "TPM-Issue-Tracker",
    "Issue Tracker — JIRA Task List",
    docHtml,
    sectionMarkdown
  );
}

export function exportRaidLogExcel(
  raidLog: RaidLogRow[],
  sectionMarkdown?: string
): void {
  exportPanelExcel(
    raidLog.map((r) => ({
      Type: r.category,
      Description: r.description,
      Owner: r.owner,
      Impact: r.impact,
      Probability: r.probability,
      Status: r.status,
      Mitigation: r.mitigation,
      "Target date": r.targetDate,
      Notes: r.notes,
    })),
    "TPM-RAID-Log",
    "RAID",
    sectionMarkdown
  );
}

export function exportRaidLogDocument(
  raidLog: RaidLogRow[],
  sectionMarkdown?: string
): void {
  const docHtml =
    raidLog.length > 0
      ? rowsToHtmlTable(
          [
            "Type",
            "Description",
            "Owner",
            "Impact",
            "Probability",
            "Status",
            "Mitigation",
            "Target date",
          ],
          raidLog.map((r) => [
            r.category,
            r.description,
            r.owner,
            r.impact,
            r.probability,
            r.status,
            r.mitigation,
            r.targetDate,
          ])
        )
      : "";
  exportPanelDocument(
    "TPM-RAID-Log",
    "RAID Log — Risks, Assumptions, Issues, Dependencies",
    docHtml,
    sectionMarkdown
  );
}

function buildMomSheetRows(minutes: MeetingMinutes): SheetRow[] {
  const sheetRows: SheetRow[] = [];
  const addSection = (section: string, items: string[]) => {
    items.forEach((item, i) => {
      sheetRows.push({ Section: i === 0 ? section : "", Content: item });
    });
  };

  if (minutes.date) sheetRows.push({ Section: "Date", Content: minutes.date });
  if (minutes.summary) sheetRows.push({ Section: "Summary", Content: minutes.summary });
  addSection("Attendees", minutes.attendees);
  addSection("Decisions", minutes.decisions);
  addSection("Action items", minutes.actionItems);
  addSection("Risks / blockers", minutes.risks);
  addSection("Open questions", minutes.openQuestions);

  if (sheetRows.length === 0 && minutes.rawBody) {
    minutes.rawBody.split("\n").forEach((line, i) => {
      if (line.trim()) {
        sheetRows.push({
          Section: i === 0 ? "Meeting notes" : "",
          Content: line.trim(),
        });
      }
    });
  }

  return sheetRows;
}

function buildMomDocumentHtml(minutes: MeetingMinutes): string {
  const parts: string[] = [];

  if (minutes.date) parts.push(`<p><strong>Date:</strong> ${minutes.date}</p>`);
  if (minutes.summary) parts.push(`<h2>Summary</h2><p>${minutes.summary}</p>`);
  if (minutes.attendees.length) {
    parts.push(
      `<h2>Attendees</h2><ul>${minutes.attendees.map((a) => `<li>${a}</li>`).join("")}</ul>`
    );
  }
  if (minutes.decisions.length) {
    parts.push(
      `<h2>Decisions</h2><ul>${minutes.decisions.map((d) => `<li>${d}</li>`).join("")}</ul>`
    );
  }
  if (minutes.actionItems.length) {
    parts.push(
      `<h2>Action items</h2><ol>${minutes.actionItems.map((a) => `<li>${a}</li>`).join("")}</ol>`
    );
  }
  if (minutes.risks.length) {
    parts.push(
      `<h2>Risks / blockers</h2><ul>${minutes.risks.map((r) => `<li>${r}</li>`).join("")}</ul>`
    );
  }
  if (minutes.openQuestions.length) {
    parts.push(
      `<h2>Open questions</h2><ul>${minutes.openQuestions.map((q) => `<li>${q}</li>`).join("")}</ul>`
    );
  }
  if (minutes.rawBody) {
    parts.push(`<h2>Full notes</h2>${markdownToHtml(minutes.rawBody)}`);
  }

  return parts.join("\n");
}

export function exportMeetingMinutesExcel(minutes: MeetingMinutes): void {
  const sheetRows = buildMomSheetRows(minutes);
  exportPanelExcel(
    sheetRows,
    "TPM-Meeting-Minutes",
    "Meeting Minutes",
    sheetRows.length === 0 ? minutes.rawBody : undefined
  );
}

export function exportMeetingMinutesDocument(minutes: MeetingMinutes): void {
  const title = minutes.title ?? "Minutes of Meeting";
  const docHtml = buildMomDocumentHtml(minutes);
  exportPanelDocument(
    "TPM-Meeting-Minutes",
    title,
    docHtml,
    !docHtml && minutes.rawBody ? minutes.rawBody : undefined
  );
}

export function canExportProjectPlan(
  rows: ProjectPlanRow[],
  sectionMarkdown?: string
): boolean {
  return rows.length > 0 || Boolean(sectionMarkdown?.trim());
}

export function canExportIssues(
  issues: JiraIssueRow[],
  sectionMarkdown?: string
): boolean {
  return issues.length > 0 || Boolean(sectionMarkdown?.trim());
}

export function canExportRaidLog(
  raidLog: RaidLogRow[],
  sectionMarkdown?: string
): boolean {
  return raidLog.length > 0 || Boolean(sectionMarkdown?.trim());
}

export function canExportMinutes(minutes: MeetingMinutes): boolean {
  return Boolean(
    minutes.rawBody ||
      minutes.title ||
      minutes.summary ||
      minutes.attendees.length ||
      minutes.decisions.length ||
      minutes.actionItems.length
  );
}
