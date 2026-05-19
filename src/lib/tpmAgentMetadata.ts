import { AGENT_ID, CONSOLE_AGENT_ID } from "@/lib/constants";

export const TPM_AGENT_METADATA = {
  name: "TPM Agent",
  tagline: "Meeting intelligence for Technical Program Managers",
  version: "1.0.0",
  standard: "GitAgent + Lyzr Studio",
  description:
    "Parses MS Teams transcripts into structured meeting outputs — Confluence MoM, Jira issues, Smartsheet project plan (WBS with overall timeline and milestone durations), and RAID log.",
  lyzr: {
    inferenceEndpoint: "https://agent-prod.studio.lyzr.ai/v3/inference/chat/",
    meetingAgentId: AGENT_ID,
    consoleAgentId: CONSOLE_AGENT_ID,
  },
  outputSections: [
    {
      key: "confluence",
      title: "1. Confluence — Meeting summary",
      description: "MoM narrative: summary, decisions, action items, risks, open questions",
    },
    {
      key: "jira",
      title: "2. JIRA — Issue tracker",
      description: "Bug and task rows with Issue Type, Key, Summary, Status, Assignee, Due",
    },
    {
      key: "smartsheet",
      title: "3. Smartsheet — Project plan",
      description:
        "WBS table: Overall Project Timeline (WBS 0), milestones (M1…), tasks (1.1.1…), duration from dates",
    },
    {
      key: "raid",
      title: "4. RAID — RAID log",
      description: "Risks, Assumptions, Issues, Dependencies with status and mitigation",
    },
  ],
  documentMetadata: [
    { field: "generated_at", example: "2026-05-19T22:00:00Z" },
    { field: "generated_by", example: "TPM Agent (Lyzr)" },
    { field: "source", example: "MS Teams" },
    { field: "document_version", example: "1.0" },
  ],
  meetingMetadata: [
    { field: "meeting_title", example: "Resident Connect Sprint Planning" },
    { field: "date", example: "2026-05-20" },
    { field: "duration_minutes", example: "45" },
    { field: "sprint", example: "HMC-ResidentConnect-May" },
    { field: "platform", example: "MS Teams" },
  ],
  integrations: ["Jira", "Confluence", "Composio MCP"],
} as const;

export type TpmSkill = {
  id: string;
  name: string;
  category: string;
  categoryColor: string;
  description: string;
  integrations: string[];
  steps: number;
  href: string;
};

export const TPM_SKILLS: TpmSkill[] = [
  {
    id: "meeting-analysis",
    name: "Meeting Analysis",
    category: "Core",
    categoryColor: "bg-primary/10 text-primary border-primary/20",
    description:
      "Ingest MS Teams transcripts and run the Lyzr agent to produce all four output sections in one pass.",
    integrations: ["Lyzr", "Composio"],
    steps: 4,
    href: "/workspace",
  },
  {
    id: "project-plan",
    name: "Project Plan (Smartsheet WBS)",
    category: "Schedule",
    categoryColor: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    description:
      "Parse Smartsheet tables with WBS 0 overall timeline, milestone rows (M1…), task rows, and duration (days) from dates or cells.",
    integrations: ["Smartsheet export"],
    steps: 5,
    href: "/workspace",
  },
  {
    id: "issue-tracker",
    name: "Issue Tracker (Jira)",
    category: "Delivery",
    categoryColor: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    description:
      "Extract Jira keys, bug vs task types, assignees, and due dates — keeps defects out of the project plan.",
    integrations: ["Jira", "Composio"],
    steps: 3,
    href: "/workspace",
  },
  {
    id: "raid-log",
    name: "RAID Log",
    category: "Risk",
    categoryColor: "bg-destructive/10 text-destructive border-destructive/20",
    description:
      "Build RAID entries from agent RAID section plus MoM risks, assumptions, and open questions.",
    integrations: ["Confluence"],
    steps: 4,
    href: "/workspace",
  },
  {
    id: "meeting-minutes",
    name: "Minutes of Meeting",
    category: "Comms",
    categoryColor: "bg-success/10 text-success border-success/20",
    description:
      "Structured MoM: title, attendees, summary, decisions, action items, risks — with Confluence link when created.",
    integrations: ["Confluence", "Composio"],
    steps: 6,
    href: "/workspace",
  },
  {
    id: "agent-console",
    name: "Agent Console Q&A",
    category: "Assist",
    categoryColor: "bg-secondary/10 text-secondary border-secondary/20",
    description:
      "Ask questions about parsed session data — plan gaps, RAID items, Jira status — via a dedicated console agent.",
    integrations: ["Lyzr"],
    steps: 2,
    href: "/console",
  },
];
