import {
  enrichProjectPlan,
  enrichProjectPlanRow,
  filterBugsFromProjectPlan,
  isBugProjectPlanRow,
  isProjectPlanMilestone,
  normalizePlanDuration,
  parseMilestoneDescriptor,
} from "./projectPlan";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const parsed = parseMilestoneDescriptor(
  "**Milestone: Product Requirements & Discovery**"
);
assert(parsed.isMilestone, "detects milestone prefix");
assert(
  parsed.title === "Product Requirements & Discovery",
  "strips markdown and label"
);

const enriched = enrichProjectPlanRow({
  taskDesc: "**Milestone: Fort Liberty Pilot**",
  start: "**20 May 2026**",
  end: "**23 May 2026**",
  duration: "",
  owner: "",
  dependency: "",
  comments: "",
});
assert(enriched.isMilestone === true, "enriched row is milestone");
assert(enriched.start === "20 May 2026", "strips dates");
assert(
  enriched.taskName?.startsWith("MILESTONE:"),
  "milestone task name uses Smartsheet format"
);
assert(isProjectPlanMilestone(enriched), "isProjectPlanMilestone");

const task = enrichProjectPlanRow({
  taskDesc: "Finalize product requirements v1.0",
  start: "20 May",
  end: "23 May",
  duration: "3",
  owner: "James Rivera",
  dependency: "",
  comments: "",
});
assert(!task.isMilestone, "regular task not milestone");

assert(
  normalizePlanDuration("3 days", "15 May 2026", "18 May 2026") === "3",
  "strips days suffix from duration"
);
assert(
  normalizePlanDuration("", "20 May 2026", "23 May 2026") === "3",
  "computes duration from start/end when cell empty"
);

const agentStyle = enrichProjectPlan([
  {
    taskDesc: "Product Requirements & Discovery",
    start: "20 May 2026",
    end: "23 May 2026",
    duration: "3",
    owner: "James Rivera",
    dependency: "",
    comments: "",
  },
  {
    taskDesc: "Finalize Resident Connect product requirements v1.0",
    start: "20 May 2026",
    end: "21 May 2026",
    duration: "1",
    owner: "James Rivera",
    dependency: "1.1.1",
    comments: "",
  },
]);
assert(
  agentStyle[0]?.isMilestone === true,
  "infers milestone when agent omits Milestone: label"
);
assert(
  agentStyle[1]?.isMilestone !== true,
  "detail task stays a task"
);

const boldPhase = enrichProjectPlan([
  {
    taskDesc: "**Technical Integration & Pilot**",
    start: "26 May 2026",
    end: "6 June 2026",
    duration: "",
    owner: "Elena Vasquez",
    dependency: "",
    comments: "",
  },
  {
    taskDesc: "Build CRM timeline MVP",
    start: "26 May 2026",
    end: "30 May 2026",
    duration: "4",
    owner: "Elena Vasquez",
    dependency: "",
    comments: "",
  },
]);
assert(boldPhase[0]?.isMilestone === true, "bold-only phase row is milestone");
assert(boldPhase[0]?.wbsId === "M1", "assigns M1 to first milestone");

const wbsRow = enrichProjectPlanRow({
  wbsId: "1.1.1",
  taskName: "            Receive requirements document",
  taskDesc: "Mario to share PRD covering Consumer & Business onboarding forms.",
  start: "02-Jun-2025",
  end: "03-Jun-2025",
  duration: "1",
  owner: "Mario (CCB) → BA",
  dependency: "M1",
  status: "Not Started",
  priority: "Critical",
  comments: "Document includes form fields.",
});
assert(wbsRow.wbsId === "1.1.1", "preserves WBS id");
assert(
  wbsRow.taskName?.includes("Receive requirements"),
  "preserves task name"
);

const bugRow = {
  wbsId: "HMC-401",
  taskName: "Move-in checklist shows wrong installation timezone for Hawaii-bound families",
  taskDesc: "",
  start: "",
  end: "",
  duration: "",
  owner: "Elena Vasquez",
  dependency: "",
  comments: "",
  status: "Open",
  priority: "High",
};
assert(isBugProjectPlanRow(bugRow), "HMC bug row detected");
const deliveryRow = {
  wbsId: "1.1",
  taskName: "Finalize Resident Connect product requirements v1.0",
  taskDesc: "",
  start: "20 May 2026",
  end: "23 May 2026",
  duration: "3",
  owner: "James Rivera",
  dependency: "",
  comments: "",
};
assert(!isBugProjectPlanRow(deliveryRow), "WBS delivery task kept");
const trackerMeta = {
  taskDesc: "Complete outstanding bugs on the excel tracker",
  start: "",
  end: "",
  duration: "",
  owner: "Monisha",
  dependency: "",
  comments: "",
};
assert(!isBugProjectPlanRow(trackerMeta), "bug-tracker meta task is not a defect row");

const filtered = filterBugsFromProjectPlan(
  [bugRow, deliveryRow],
  [{ key: "HMC-401", summary: bugRow.taskName, action: "unknown", issueType: "Bug" }]
);
assert(filtered.length === 1, "filters bug from plan");
assert(filtered[0]?.wbsId === "1.1", "keeps delivery task");

const numericWbsMilestone = enrichProjectPlan([
  {
    wbsId: "1.0",
    taskName: "MILESTONE: Product Requirements",
    taskDesc: "Phase summary",
    start: "20 May 2026",
    end: "23 May 2026",
    duration: "3",
    owner: "James Rivera",
    dependency: "",
    comments: "",
  },
  {
    wbsId: "1.1",
    taskName: "MILESTONE: Gather stakeholder inputs",
    taskDesc: "",
    start: "20 May 2026",
    end: "21 May 2026",
    duration: "1",
    owner: "James Rivera",
    dependency: "",
    comments: "",
  },
  {
    wbsId: "1.1.1",
    taskName: "Finalize product requirements v1.0",
    taskDesc: "",
    start: "20 May 2026",
    end: "23 May 2026",
    duration: "3",
    owner: "James Rivera",
    dependency: "",
    comments: "",
  },
]);
assert(
  !numericWbsMilestone.some((r) => r.wbsId === "1.0" && r.isMilestone),
  "numeric WBS 1.0 is not a milestone"
);
assert(
  numericWbsMilestone.find((r) => r.wbsId === "1.0")?.taskName === "Product Requirements",
  "strips MILESTONE prefix from mislabeled task"
);
assert(
  !numericWbsMilestone.some((r) => r.wbsId === "1.1" && r.isMilestone),
  "numeric WBS 1.1 is not a milestone"
);

const transcriptTasks = enrichProjectPlan([
  {
    wbsId: "1.1",
    taskName: "Finalize product requirements v1.0",
    taskDesc: "",
    start: "20 May 2026",
    end: "23 May 2026",
    duration: "3",
    owner: "James Rivera",
    dependency: "",
    comments: "",
  },
  {
    wbsId: "2.1",
    taskName: "Fort Liberty SSO and lease sync spike",
    taskDesc: "",
    start: "21 May 2026",
    end: "27 May 2026",
    duration: "5",
    owner: "Elena Vasquez",
    dependency: "1.1",
    comments: "",
  },
]);
assert(
  transcriptTasks.every((r) => !r.isMilestone),
  "transcript delivery tasks stay tasks"
);

console.log("projectPlan.test.ts: all assertions passed");
