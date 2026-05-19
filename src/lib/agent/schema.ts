import { z } from "zod";

/** Lyzr Studio chat API — fields we may receive (partial). */
export const LyzrUpstreamResponseSchema = z
  .object({
    session_id: z.string().optional(),
    answer_markdown: z.string().optional(),
    answer: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    markdown: z.string().optional(),
    response: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    message: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    content: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    reply: z.string().optional(),
    output: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    result: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    text: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const JiraActionSchema = z.enum([
  "created",
  "updated",
  "commented",
  "unknown",
]);

export const JiraIssueRowSchema = z
  .object({
    key: z.string(),
    summary: z.string(),
    action: JiraActionSchema,
    status: z.string().optional(),
    issueType: z.string().optional(),
    assignee: z.string().optional(),
    dueDate: z.string().optional(),
    priority: z.string().optional(),
    url: z.string().optional(),
  })
  .passthrough();

export const ProjectPlanRowSchema = z
  .object({
    wbsId: z.string().optional(),
    taskName: z.string().optional(),
    taskDesc: z.string(),
    start: z.string(),
    end: z.string(),
    duration: z.string(),
    owner: z.string(),
    dependency: z.string(),
    status: z.string().optional(),
    priority: z.string().optional(),
    comments: z.string(),
    taskNumber: z.number().optional(),
    isMilestone: z.boolean().optional(),
    milestoneTitle: z.string().optional(),
  })
  .passthrough();

export const RaidCategorySchema = z.enum([
  "Risk",
  "Assumption",
  "Issue",
  "Dependency",
]);

export const RaidStatusSchema = z.enum([
  "Open",
  "Mitigating",
  "Closed",
  "Accepted",
]);

export const RaidLogRowSchema = z
  .object({
    id: z.string(),
    category: RaidCategorySchema,
    description: z.string(),
    owner: z.string(),
    impact: z.string(),
    probability: z.string(),
    status: RaidStatusSchema,
    mitigation: z.string(),
    targetDate: z.string(),
    notes: z.string(),
  })
  .passthrough();

export const MeetingMinutesSchema = z
  .object({
    title: z.string().optional(),
    date: z.string().optional(),
    attendees: z.array(z.string()),
    summary: z.string().optional(),
    decisions: z.array(z.string()),
    actionItems: z.array(z.string()),
    risks: z.array(z.string()),
    openQuestions: z.array(z.string()),
    confluenceLink: z.string().optional(),
    confluenceTitle: z.string().optional(),
    rawBody: z.string().optional(),
  })
  .passthrough();

export const AgentMainSectionsSchema = z.object({
  confluence: z.string(),
  jira: z.string(),
  smartsheet: z.string(),
  raid: z.string(),
});

export const AgentParseMetaSchema = z.object({
  warnings: z.array(z.string()),
  sectionKeysFound: z.array(z.string()),
  extensionKeysFound: z.array(z.string()),
  usedStructuredJson: z.boolean(),
  parsedAt: z.string(),
  counts: z.object({
    issues: z.number(),
    projectPlan: z.number(),
    raidLog: z.number(),
    momListSections: z.number(),
  }),
});

export const ParsedAgentResponseSchema = z
  .object({
    issues: z.array(JiraIssueRowSchema),
    projectPlan: z.array(ProjectPlanRowSchema),
    raidLog: z.array(RaidLogRowSchema),
    meetingMinutes: MeetingMinutesSchema,
    confluenceLink: z.string().nullable(),
    rawSections: z.record(z.string(), z.string()),
    sections: AgentMainSectionsSchema,
    sourceMarkdown: z.string(),
    extensions: z.record(z.string(), z.string()),
    extra: z.record(z.string(), z.unknown()),
    parseMeta: AgentParseMetaSchema,
  })
  .passthrough();

/** Optional JSON shape if the agent returns structured TPM data. */
export const StructuredTpmPayloadSchema = z
  .object({
    confluence: z.union([z.string(), MeetingMinutesSchema]).optional(),
    meetingMinutes: MeetingMinutesSchema.optional(),
    jira: z.union([z.string(), z.array(JiraIssueRowSchema)]).optional(),
    issues: z.array(JiraIssueRowSchema).optional(),
    smartsheet: z.union([z.string(), z.array(ProjectPlanRowSchema)]).optional(),
    projectPlan: z.array(ProjectPlanRowSchema).optional(),
    raid: z.union([z.string(), z.array(RaidLogRowSchema)]).optional(),
    raidLog: z.array(RaidLogRowSchema).optional(),
    sections: AgentMainSectionsSchema.partial().optional(),
    confluenceLink: z.string().nullable().optional(),
    extensions: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

export type ParsedAgentResponseInput = z.input<typeof ParsedAgentResponseSchema>;
export type ParsedAgentResponseOutput = z.output<typeof ParsedAgentResponseSchema>;
