import type { CallToActionEntry } from "@/types/meetingPayload";

export type CtaCategory =
  | "Blockers & Escalations"
  | "Deadline & Schedule Alerts"
  | "Accountability & Ownership"
  | "Meeting & MoM Follow-ups"
  | "Health & Progress Anomalies";

export type AgentSlug = "escalation" | "accountability";

export type AgentCategoryConfig = {
  id: string;
  label: string;
  schemaCategory: CtaCategory;
};

export const ESCALATION_AGENT_CATEGORIES: AgentCategoryConfig[] = [
  { id: "schedule-alert", label: "Schedule Alert", schemaCategory: "Deadline & Schedule Alerts" },
  { id: "progress-anomaly", label: "Progress Anomaly", schemaCategory: "Health & Progress Anomalies" },
  { id: "blockers", label: "Blockers", schemaCategory: "Blockers & Escalations" },
];

export const ACCOUNTABILITY_AGENT_CATEGORIES: AgentCategoryConfig[] = [
  { id: "ownership", label: "Ownership", schemaCategory: "Accountability & Ownership" },
  { id: "follow-up", label: "Follow-up", schemaCategory: "Meeting & MoM Follow-ups" },
];

export function getAgentConfig(slug: AgentSlug): {
  slug: AgentSlug;
  title: string;
  categories: AgentCategoryConfig[];
} {
  if (slug === "accountability") {
    return {
      slug,
      title: "Accountability Agent",
      categories: ACCOUNTABILITY_AGENT_CATEGORIES,
    };
  }
  return {
    slug,
    title: "Escalation Agent",
    categories: ESCALATION_AGENT_CATEGORIES,
  };
}

export function isAgentSlug(value: string): value is AgentSlug {
  return value === "escalation" || value === "accountability";
}

export type AggregatedCtaItem = {
  sessionId: string;
  projectTitle: string;
  projectKey: string;
  cta: CallToActionEntry;
};

export function normalizeCtaCategory(value: string): CtaCategory | null {
  const categories: CtaCategory[] = [
    "Blockers & Escalations",
    "Deadline & Schedule Alerts",
    "Accountability & Ownership",
    "Meeting & MoM Follow-ups",
    "Health & Progress Anomalies",
  ];
  if (categories.includes(value as CtaCategory)) return value as CtaCategory;
  return null;
}

export function buildCategoryStats(
  items: AggregatedCtaItem[],
  schemaCategory: CtaCategory
): { pendingActions: number; projectCount: number; totalActions: number } {
  const inCategory = items.filter(
    (item) => normalizeCtaCategory(item.cta.category) === schemaCategory
  );
  const pendingActions = inCategory.filter((item) => item.cta.status === "Pending").length;
  const projectKeys = new Set(inCategory.map((item) => item.projectKey));
  return {
    pendingActions,
    projectCount: projectKeys.size,
    totalActions: inCategory.length,
  };
}
