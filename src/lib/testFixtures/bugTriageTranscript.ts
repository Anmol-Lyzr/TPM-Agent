/** Test-only bug-triage transcript (not exposed in Workspace UI). */
export const BUG_TRIAGE_TRANSCRIPT = `Microsoft Teams meeting recap
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
