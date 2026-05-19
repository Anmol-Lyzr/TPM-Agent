import { z } from "zod";

const priorityEnum = z.enum(["Low", "Medium", "High", "Critical"]);
const actionStatusEnum = z.enum(["To Do", "In Progress", "Done", "Blocked"]);
const jiraIssueTypeEnum = z.enum(["Bug", "Story", "Task", "Epic"]);
const jiraStatusEnum = z.enum([
  "Open",
  "To Do",
  "In Progress",
  "Done",
  "Blocked",
]);
const sprintPriorityTypeEnum = z.enum(["Bug", "Story", "Task", "Milestone"]);
const milestoneStatusEnum = z.enum([
  "Not Started",
  "In Progress",
  "Completed",
]);
const bugSeverityEnum = z.enum(["Low", "Medium", "High", "Critical"]);
const bugPriorityEnum = z.enum(["P1", "P2", "P3", "P4"]);
const bugStatusEnum = z.enum([
  "Open",
  "In Progress",
  "Resolved",
  "Closed",
]);
const raidProbabilityEnum = z.enum(["Low", "Medium", "High"]);
const raidRiskStatusEnum = z.enum(["Open", "Mitigated", "Closed"]);
const raidAssumptionStatusEnum = z.enum(["Open", "Validated", "Invalid"]);
const raidIssueStatusEnum = z.enum(["Open", "In Remediation", "Closed"]);
const raidDependencyTypeEnum = z.enum(["Internal", "External"]);
const raidDependencyStatusEnum = z.enum([
  "Open",
  "Waiting",
  "Active",
  "Completed",
]);
const documentSourceEnum = z.enum([
  "Meeting Transcript",
  "MS Teams",
  "Manual Notes",
]);

export const MeetingMinutesPayloadSchema = z
  .object({
    meeting_metadata: z
      .object({
        meeting_title: z.string(),
        date: z.string(),
        duration_minutes: z.number(),
        sprint: z.string(),
        pilot_installation: z.object({
          name: z.string(),
          location: z.string(),
          status: z.string(),
        }),
        recording_available: z.boolean(),
        platform: z.string(),
      })
      .strict(),
    attendees: z.array(
      z
        .object({
          name: z.string(),
          initials: z.string(),
          role: z.string(),
          organization: z.string(),
        })
        .strict()
    ),
    product_context: z
      .object({
        product_name: z.string(),
        description: z.string(),
        core_capabilities: z.array(z.string()),
        value_propositions: z.array(z.string()),
      })
      .strict(),
    discussion_topics: z.array(
      z
        .object({
          topic_id: z.string(),
          title: z.string(),
          summary: z.string(),
          details: z
            .object({
              key_points: z.array(z.string()),
              risks: z.array(z.string()),
              decisions: z.array(z.string()),
              dependencies: z.array(z.string()),
            })
            .strict(),
        })
        .strict()
    ),
    decisions: z.array(
      z
        .object({
          decision_id: z.string(),
          decision: z.string(),
          made_by: z.array(z.string()),
          priority: priorityEnum,
          related_modules: z.array(z.string()),
        })
        .strict()
    ),
    action_items: z.array(
      z
        .object({
          action_id: z.string(),
          title: z.string(),
          description: z.string(),
          owner: z.array(z.string()),
          sprint: z.string(),
          status: actionStatusEnum,
          priority: priorityEnum,
          due_date: z.string(),
          target_outcome: z.string(),
          dependencies: z.array(z.string()),
        })
        .strict()
    ),
    sprint_priorities: z.array(
      z
        .object({
          sprint: z.string(),
          priorities: z.array(
            z
              .object({
                rank: z.number(),
                item: z.string(),
                type: sprintPriorityTypeEnum,
              })
              .strict()
          ),
        })
        .strict()
    ),
    jira_issues: z.array(
      z
        .object({
          issue_key: z.string(),
          issue_type: jiraIssueTypeEnum,
          summary: z.string(),
          description: z.string(),
          priority: priorityEnum,
          status: jiraStatusEnum,
          assignee: z.string(),
          reporter: z.string(),
          sprint: z.string(),
          epic: z.string(),
          labels: z.array(z.string()),
          story_points: z.number(),
          blocked_by: z.array(z.string()),
          due_date: z.string(),
          acceptance_criteria: z.array(z.string()),
        })
        .strict()
    ),
    project_plan: z
      .object({
        assumptions: z
          .object({
            sprint_duration_weeks: z.number(),
            target_ga_date: z.string(),
          })
          .strict(),
        milestones: z.array(
          z
            .object({
              milestone_id: z.string(),
              title: z.string(),
              start_date: z.string(),
              end_date: z.string(),
              owner: z.string(),
              status: milestoneStatusEnum,
              dependencies: z.array(z.string()),
              tasks: z.array(
                z
                  .object({
                    task_id: z.string(),
                    title: z.string(),
                    description: z.string(),
                    start_date: z.string(),
                    end_date: z.string(),
                    duration_days: z.number(),
                    owner: z.string(),
                    status: actionStatusEnum,
                    dependency_ids: z.array(z.string()),
                    comments: z.string(),
                  })
                  .strict()
              ),
            })
            .strict()
        ),
      })
      .strict(),
    bug_tracker: z.array(
      z
        .object({
          bug_id: z.string(),
          summary: z.string(),
          severity: bugSeverityEnum,
          priority: bugPriorityEnum,
          status: bugStatusEnum,
          reporter: z.string(),
          assignee: z.string(),
          module: z.string(),
          root_cause: z.string(),
          steps_to_reproduce: z.array(z.string()),
          impact: z.string(),
          workaround: z.string(),
          resolution_plan: z.string(),
          date_opened: z.string(),
          date_resolved: z.union([z.string(), z.null()]),
        })
        .strict()
    ),
    raid_log: z
      .object({
        risks: z.array(
          z
            .object({
              risk_id: z.string(),
              description: z.string(),
              category: z.string(),
              probability: raidProbabilityEnum,
              impact: raidProbabilityEnum,
              risk_level: priorityEnum,
              owner: z.string(),
              identified_date: z.string(),
              mitigation_strategy: z.string(),
              contingency_plan: z.string(),
              status: raidRiskStatusEnum,
              related_tasks: z.array(z.string()),
            })
            .strict()
        ),
        assumptions: z.array(
          z
            .object({
              assumption_id: z.string(),
              description: z.string(),
              owner: z.string(),
              identified_date: z.string(),
              impact_if_invalid: z.string(),
              validation_approach: z.string(),
              status: raidAssumptionStatusEnum,
            })
            .strict()
        ),
        issues: z.array(
          z
            .object({
              issue_id: z.string(),
              description: z.string(),
              category: z.string(),
              priority: priorityEnum,
              owner: z.string(),
              identified_date: z.string(),
              impact: z.string(),
              resolution_path: z.string(),
              status: raidIssueStatusEnum,
              related_tasks: z.array(z.string()),
            })
            .strict()
        ),
        dependencies: z.array(
          z
            .object({
              dependency_id: z.string(),
              description: z.string(),
              type: raidDependencyTypeEnum,
              owner: z.string(),
              provider: z.string(),
              dependent_tasks: z.array(z.string()),
              identified_date: z.string(),
              expected_resolution_date: z.string(),
              status: raidDependencyStatusEnum,
              impact_if_delayed: z.string(),
            })
            .strict()
        ),
      })
      .strict(),
    metadata: z
      .object({
        generated_at: z.string(),
        generated_by: z.string(),
        source: documentSourceEnum,
        document_version: z.string(),
      })
      .strict(),
  })
  .strict();

export type MeetingMinutesPayloadParsed = z.infer<
  typeof MeetingMinutesPayloadSchema
>;

const REQUIRED_TOP_LEVEL_KEYS = [
  "meeting_metadata",
  "attendees",
  "product_context",
  "discussion_topics",
  "decisions",
  "action_items",
  "sprint_priorities",
  "jira_issues",
  "project_plan",
  "bug_tracker",
  "raid_log",
  "metadata",
] as const;

/** Detect the Meeting Minutes structured JSON shape (vs legacy TPM payload). */
export function isMeetingMinutesPayload(
  record: Record<string, unknown>
): boolean {
  return REQUIRED_TOP_LEVEL_KEYS.every((key) => key in record);
}

/** Parse meeting-minutes JSON only when it fully matches the schema (no unsafe casts). */
export function parseMeetingMinutesPayload(
  value: unknown
): MeetingMinutesPayloadParsed | null {
  const result = MeetingMinutesPayloadSchema.safeParse(value);
  return result.success ? result.data : null;
}
