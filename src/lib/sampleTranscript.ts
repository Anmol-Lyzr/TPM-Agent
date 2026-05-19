/**
 * Hunt Military Communities — Resident Connect platform discovery.
 * Loaded via Workspace → "Load sample".
 */
export const SAMPLE_TRANSCRIPT = `Microsoft Teams meeting recap
Meeting: Hunt Military Communities — Resident Connect Platform Discovery & Sprint Planning
Date: Tuesday, 20 May 2026 · 2:00–2:50 PM ET
Organizer: Sarah Mitchell (Technical Program Manager)
Participants: Sarah Mitchell, James Rivera (Product — Resident Experience), Elena Vasquez (Engineering Lead), Marcus Chen (Community Operations & CRM), Amanda Holt (Installation Partnerships)

---

[00:00:10] Sarah Mitchell
Thanks everyone. Hunt Military Communities is the nation's largest privatized military housing operator—more than sixty thousand homes across roughly fifty-nine installations for Navy, Army, Air Force, Marine Corps, and Space Force families. Today's goal is to align on Resident Connect, our new digital product for resident onboarding, relationship management, and community engagement, and to lock sprint scope for the Fort Liberty pilot.

[00:00:52] James Rivera
Product description for the transcript and Confluence: Resident Connect is a unified web and mobile platform. It replaces fragmented email and paper workflows for PCS moves, lease execution, maintenance requests, and community manager outreach. Core modules are: one, Digital Move-In—orders upload, household profile, pet registration, and installation-specific checklists. Two, Relationship Hub—a CRM-style timeline so each community's Resident Service Specialist sees every touchpoint, satisfaction pulse, and open case. Three, Maintenance & Emergencies—24/7 request intake integrated with our existing work-order system. Four, Hunt Promise Center—Tenant Bill of Rights disclosures, dispute intake, and escalation to corporate via the Hunt Promise email path. Success metrics for the pilot: reduce average onboarding time from eleven days to six, increase first-contact resolution for non-emergency inquiries by twenty percent, and raise resident NPS at Fort Liberty by five points by Q3.

[00:02:05] Amanda Holt
From an installation partnership view, Fort Liberty housing office needs bilingual onboarding copy and clear handoff when families arrive mid-PCS without orders finalized. If Resident Connect cannot support Spanish and German preference on day one, we risk pushback from the garrison commander before we expand to other HMC communities.

[00:02:40] Elena Vasquez
Technical scope for phase one pilot: OAuth through our enterprise IdP, read-only sync from the legacy lease database nightly, and bidirectional maintenance tickets via API. We are not rebuilding the universal lease PDF engine in v1—that stays in the document service. Engineering estimate is two sprints for MVP at one installation, then hardening sprint before portfolio rollout.

[00:03:18] Marcus Chen
CRM and relationship management: specialists need a single resident timeline, not five systems. Today they copy notes from email into SharePoint. Resident Connect must show lease status, last maintenance visit, open Hunt Promise cases, and automated nudges when move-in milestones slip. I want a pilot cohort of eight specialists at Fort Liberty trained by 2 June.

[00:03:55] James Rivera
Open product gaps we still owe: housing preference survey after profile creation, integration with the pet policy attestation PDF, and a dashboard for area managers to see onboarding funnel conversion by neighborhood.

[00:04:22] Elena Vasquez
Defect review from QA and pilot feedback—logging these as Bug type in Jira for the agent import.

[00:04:35] Elena Vasquez
Bug HMC-401 "Move-in checklist shows wrong installation timezone for Hawaii-bound families." Status Open. Priority High. Assignee Elena Vasquez. Due 23 May 2026.

[00:04:55] Marcus Chen
Bug HMC-402 "CRM timeline duplicates entries when specialist adds note and system auto-logs email." Status In Progress. Priority Medium. Assignee Marcus Chen. Due 22 May 2026.

[00:05:12] Elena Vasquez
Bug HMC-403 "OAuth session expires during lease e-sign flow on mobile Safari." Status Open. Priority Critical. Assignee Elena Vasquez. Due 21 May 2026. This blocks the soft launch dress rehearsal.

[00:05:32] James Rivera
Bug HMC-404 "Hunt Promise dispute form does not attach photos larger than five megabytes." Status To Do. Priority Medium. Assignee James Rivera. Due 26 May 2026.

[00:05:48] Amanda Holt
Community operations reported Bug HMC-405 "Welcome email template pulls outdated BAH rate table for Fort Liberty." Status Open. Priority High. Assignee Amanda Holt. Due 24 May 2026.

[00:06:05] Elena Vasquez
Regression Bug HMC-406 "Maintenance emergency banner ignores after-hours routing rules on weekends." Status Open. Priority Critical. Assignee Elena Vasquez. Due 20 May 2026.

[00:06:25] Sarah Mitchell
Existing delivery items not defects: Task HMC-120 "Integrate nightly lease sync job with observability alerts." Status In Progress. Assignee Elena Vasquez. Priority High. Due 28 May 2026. Task HMC-121 "Draft Fort Liberty specialist training curriculum." Status To Do. Assignee Marcus Chen. Due 30 May 2026.

[00:07:00] Sarah Mitchell
Schedule for Smartsheet project plan—confirm owners and dates.
Task one: "Finalize Resident Connect product requirements v1.0." Start 20 May, end 23 May, three days, owner James Rivera.
Task two: "Complete Fort Liberty SSO and lease sync technical spike." Start 21 May, end 27 May, five days, owner Elena Vasquez. Depends on task one.
Task three: "Build CRM timeline MVP for specialists." Start 26 May, end 6 June, eight days, owner Elena Vasquez. Depends on task two.
Task four: "Pilot training and change management for eight specialists." Start 28 May, end 4 June, six days, owner Marcus Chen. Depends on task three.
Task five: "Installation partnership sign-off for bilingual onboarding copy." Start 22 May, end 29 May, six days, owner Amanda Holt.

[00:08:10] James Rivera
Decisions:
Decision one—Fort Liberty is the sole phase-one pilot; no second installation until NPS and defect burn-down gates are met.
Decision two—Resident Connect v1 launches with English and Spanish; German deferred to v1.1 per Amanda's garrison feedback.
Decision three—Hunt Promise dispute photos capped at ten megabytes in v1; we will document the limit in the resident FAQ.

[00:08:45] Marcus Chen
Action items:
1. Elena to fix HMC-403 before 21 May dress rehearsal — Owner Elena Vasquez — Due 21 May 2026 — Priority Critical.
2. James to publish updated product requirements in Confluence — Owner James Rivera — Due 23 May 2026.
3. Amanda to deliver bilingual onboarding strings to engineering — Owner Amanda Holt — Due 29 May 2026.
4. Sarah to schedule executive readout with HMC leadership — Owner Sarah Mitchell — Due 2 June 2026.

[00:09:20] Amanda Holt
Risks / blockers:
- Legacy lease database schema changes from the Homeport integration may slip the nightly sync and delay CRM accuracy.
- Garrison commander visibility demo on 2 June depends on HMC-403 and HMC-406 being resolved.
- Specialist adoption risk if training materials are not ready before soft launch.

[00:09:45] James Rivera
Open questions:
- Do we need CAC/PIV authentication for DOD civilian residents in v1 or can we defer to v2?
- Which executive sponsor signs the portfolio rollout charter—COO or Chief Resident Experience Officer?

[00:10:05] Sarah Mitchell
Dependencies: task three depends on task two; pilot training depends on CRM MVP; executive readout depends on dress rehearsal pass. Assumption: Fort Liberty IT firewall rules for the new API endpoints are approved by 25 May—we have not received written confirmation.

[00:10:30] Elena Vasquez
Recap for Jira Excel import—include Issue Type Bug for HMC-401 through HMC-406, and tasks HMC-120, HMC-121. Sprint label HMC-ResidentConnect-May. Update assignees and statuses as discussed.

[00:10:50] Sarah Mitchell
I will post Confluence meeting notes and share the RAID log with program leadership. Thanks everyone—this product directly supports how HMC serves military families at scale.

[End of transcript]`;

/** Bug-triage meeting — structured so the agent emits Jira rows with Issue Type Bug. */
export const SAMPLE_BUG_TRANSCRIPT = `Microsoft Teams meeting recap
Meeting: RPT Excel Bug Triage & Production Defect Review
Date: Monday, 19 May 2026 · 10:00–10:35 AM IST
Organizer: Anmol Varshney
Participants: Anmol Varshney, Monisha Anandaraj, Rahul Mehta (Engineering Lead)

---

[00:00:05] Anmol Varshney
This session is only for defect triage. Every item we confirm today must be logged in Jira with Issue Type Bug—not Task or Story. We are reviewing the Excel tracker export and production defects for the RPT program.

[00:00:40] Monisha Anandaraj
From the Excel bug list, row one: Bug SCRUM-201 "Export to CSV drops currency formatting on totals column." Status Open. Priority High. Assignee Monisha Anandaraj. Due 22 May 2026.

[00:01:05] Monisha Anandaraj
Row two: Bug SCRUM-202 "Filter by owner returns empty when name has apostrophe." Status In Progress. Priority Medium. Assignee Monisha. Due 20 May 2026.

[00:01:28] Rahul Mehta
Production defect Bug SCRUM-203 "API 500 on /reports/summary when date range spans fiscal year." Status Open. Priority Critical. Assignee Rahul Mehta. Due 18 May 2026. This was created yesterday from support tickets.

[00:01:55] Rahul Mehta
Another production Bug SCRUM-204 "Session timeout after 15 minutes on dashboard refresh." Status To Do. Priority High. Assignee Rahul Mehta. Due 21 May 2026.

[00:02:18] Monisha Anandaraj
Excel tracker Bug SCRUM-205 "Duplicate rows when sorting by priority column." Status Open. Priority Low. Assignee unassigned. We need to assign by EOD.

[00:02:42] Anmol Varshney
Customer-reported Bug SCRUM-206 "Email notification shows wrong timezone for due dates." Status Open. Priority Medium. Assignee Monisha Anandaraj. Due 23 May 2026.

[00:03:05] Rahul Mehta
Regression Bug SCRUM-207 "Mobile layout breaks on issue detail drawer below 768px." Status In Progress. Priority Medium. Assignee Rahul Mehta. Due 19 May 2026.

[00:03:28] Monisha Anandaraj
Data bug SCRUM-208 "Jira sync writes null priority for imported Excel rows." Status Open. Priority High. Assignee Monisha. Due 20 May 2026.

[00:03:50] Anmol Varshney
We also have a new defect to create: Bug SCRUM-209 "Confluence macro fails when RAID table exceeds 50 rows." Status To Do. Priority Medium. Assignee Rahul Mehta. Due 24 May 2026.

[00:04:12] Rahul Mehta
Security-related Bug SCRUM-210 "OAuth redirect allows http callback on staging." Status Open. Priority Critical. Assignee Rahul Mehta. Due 17 May 2026—overdue, escalate today.

[00:04:35] Monisha Anandaraj
Performance Bug SCRUM-211 "Analyze Meeting spinner never clears on slow agent response." Status Open. Priority High. Assignee Monisha. Due 21 May 2026.

[00:04:55] Anmol Varshney
Decisions: all eleven keys stay in the RPT-May sprint as Bug type. Rahul owns SCRUM-203, SCRUM-204, SCRUM-207, SCRUM-209, SCRUM-210. Monisha owns the rest.

[00:05:15] Rahul Mehta
Recap for Jira Excel import—Issue Type must be Bug for every row: SCRUM-201, SCRUM-202, SCRUM-203, SCRUM-204, SCRUM-205, SCRUM-206, SCRUM-207, SCRUM-208, SCRUM-209, SCRUM-210, SCRUM-211. Update status and assignees as discussed.

[00:05:35] Anmol Varshney
I will post Confluence notes and share the updated bug list with leadership. Thanks everyone.

[End of transcript]`;
