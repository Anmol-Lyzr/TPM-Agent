export const SAMPLE_TRANSCRIPT = `Microsoft Teams meeting recap
Meeting: Cross-Project TPM Review — Atlas Carryover, Phoenix Kickoff & Q2 Escalations
Date: Friday, 16 May 2026 · 11:00–11:45 AM IST
Organizer: Anmol Varshney
Participants: Anmol Varshney, Monisha Anandaraj, Priya Sharma, Rahul Mehta (Engineering Lead), Neha Kapoor (Program Management)

---

[00:00:08] Anmol Varshney
Thanks everyone for joining. Today we are covering three things: open issues from completed or in-flight projects—Atlas and Signal—what is still pending, new work for Phoenix and the Analytics Dashboard, and escalations leadership asked us to log formally.

[00:00:45] Rahul Mehta
Starting with Atlas, which wrapped phase one in April. We still have production incidents tied to SCRUM-12 "Fix SSO timeout on legacy login"—that was supposed to close 30 April. It is still In Progress. Assignee is Rahul Mehta. Priority is High. Customer support logged four tickets last week.

[00:01:18] Neha Kapoor
SCRUM-18 is another carryover: "Migrate batch jobs to new scheduler." Monisha was owner; we paused it when Phoenix planning started. Status is blocked. Dependency was DevOps providing the new queue credentials—they promised 9 May and we still do not have them. I am escalating to their VP this afternoon.

[00:01:52] Monisha Anandaraj
On Atlas, my outstanding item is SCRUM-22 "Document API deprecation timeline for partners." Due date was 10 May; I missed it because of RPT work. I need a new due date of 22 May 2026. Priority Medium. I will add a comment in Jira today.

[00:02:30] Priya Sharma
Signal project—the customer dispute workflow—is not fully closed either. SCRUM-31 "UAT sign-off for dispute resolution emails" is with Priya Sharma, still To Do. Legal wants revised wording before we can close. That blocks the program-level sign-off we promised leadership for end of May.

[00:03:05] Anmol Varshney
Let us log that as a program risk. Decision for today: we will not announce Signal as GA until SCRUM-31 is Done. Priya will target 25 May for legal review completion.

[00:03:40] Priya Sharma
Agreed. I will schedule a 30-minute review with legal on 20 May.

[00:04:02] Anmol Varshney
Moving to new upcoming projects. First is Phoenix Mobile SDK integration—kickoff is 26 May. Phase zero is two weeks: discovery and technical spike. Rahul owns the spike; start 26 May, end 6 June. Second new project is Atlas Analytics Dashboard Q3—product wants a read-only metrics view for enterprise customers. That is a new initiative, not the old Atlas portal.

[00:04:48] Neha Kapoor
For Phoenix, we need a new epic in Jira: PHX-1 "Phoenix SDK — Phase 0 discovery." Rahul is assignee. Sprint PHX-Kickoff. Labels Phoenix, mobile, discovery.

[00:05:15] Rahul Mehta
For Analytics Dashboard, I want a task: "Draft system architecture for Atlas Analytics Dashboard." I can start 19 May after the SSO fix stabilizes, finish 23 May—four days. Owner Rahul Mehta. It depends on closing SCRUM-12 first—we cannot size analytics ingestion until auth is stable.

[00:05:55] Monisha Anandaraj
I will take "Build Figma prototypes for Analytics Dashboard v1." Start 20 May, end 27 May. Seven days. Dependency on Rahul's architecture draft—task number two in the schedule sense, depends on his architecture task.

[00:06:28] Anmol Varshney
Pending tasks from this week that are not Atlas carryover: SCRUM-5 "Complete the RPT Idea" stays with Monisha, due 21 May 2026, Medium priority. SCRUM-3 "Task 3" stays To Do—Monisha will only comment, no assignee change.

[00:07:02] Monisha Anandaraj
New upcoming tasks I am picking up:
One—Complete outstanding bugs on the Excel tracker from the RPT program. No fixed end date in this meeting but I commit to a status update by 19 May.
Two—Create an agent to notify RPT task owners when end dates are nearing. Start 19 May, finish 21 May, two days build. Depends on completing the RPT tracker on Lovable, which runs 15 May through 18 May, three days.
Three—Add priority fields to all active trackers. Owner Monisha Anandaraj, target complete 24 May.

[00:08:10] Rahul Mehta
New task for me: "Set up CI pipeline for Phoenix sample app." Start 28 May, end 30 May. Two days. Depends on PHX-1 discovery outputs.

[00:08:45] Neha Kapoor
Major decisions we need in the minutes:
Decision one—Phoenix phase zero officially starts 26 May; no engineering bandwidth on Phoenix before SCRUM-12 is resolved.
Decision two—Signal GA date slips until SCRUM-31 is Done; executive comms will say "early June" instead of 31 May.
Decision three—Analytics Dashboard Q3 is approved for discovery only; no commitment to build until architecture review on 28 May.

[00:09:25] Anmol Varshney
Escalations:
Escalation one—I escalated to DevOps VP today for queue credentials blocking SCRUM-18; Neha is following up if no response by EOD.
Escalation two—Rahul escalated SSO production incidents to the security council yesterday; we need a war room if SCRUM-12 is not fixed by 18 May.
Escalation three—Priya escalated legal turnaround on SCRUM-31 to the Chief Legal Officer's chief of staff; target response 21 May.

[00:10:05] Priya Sharma
Open questions: Do we have headcount for Analytics Dashboard build in Q3 if architecture is approved? And who is the executive sponsor for Phoenix—still TBD?

[00:10:28] Anmol Varshney
Risks: SCRUM-12 slip pushes both Phoenix and Analytics. SCRUM-18 block may force us to run batch jobs on legacy infra through June. Excel tracker bugs may delay RPT executive review on 22 May.

[00:10:55] Neha Kapoor
Recap—update Jira for all keys mentioned: SCRUM-3, SCRUM-5, SCRUM-12, SCRUM-18, SCRUM-22, SCRUM-31, PHX-1, plus new tasks for architecture, Figma, CI pipeline, Excel bugs, reminder agent, and tracker priorities. Sprint tags: RPT-May for RPT items, PHX-Kickoff for Phoenix, Atlas-Q3 for analytics discovery.

[00:11:20] Anmol Varshney
I will post Confluence notes and ping the escalation owners. Anything else? … No. Thanks everyone.

[End of transcript]`;
