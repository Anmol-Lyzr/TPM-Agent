/**
 * Short HMC (Resident Connect) sample for Workspace → "Load sample".
 * Kept brief so analyze completes within Vercel serverless limits (~2 min).
 */
export const SAMPLE_TRANSCRIPT = `Microsoft Teams recap
Meeting: Hunt Military Communities — Resident Connect Sprint Planning
Date: 20 May 2026 · 2:00 PM ET
Organizer: Ayush Kumar (TPM)
Participants: Ayush Kumar, Utsab Ojha (Product), Naveen B (Engineering)

[00:00:10] Ayush Kumar
Align on Resident Connect pilot at Fort Liberty: digital move-in, CRM timeline, and maintenance intake.

[00:01:00] Utsab Ojha
Decisions: Fort Liberty only for v1; English and Spanish on day one; Hunt Promise photo limit 10 MB in FAQ.

[00:02:00] Naveen B
Bugs for Jira — Issue Type Bug, sprint HMC-ResidentConnect-May:
Bug HMC-401 "Move-in checklist wrong timezone for Hawaii families." Open, High, Naveen B, due 23 May 2026.
Bug HMC-403 "OAuth session expires during lease e-sign on mobile Safari." Open, Critical, Naveen B, due 21 May 2026.

Tasks (not bugs):
Task HMC-120 "Integrate nightly lease sync with alerts." In Progress, High, Naveen B, due 28 May 2026.

Smartsheet schedule:
Task 1 "Finalize product requirements v1.0." Start 20 May, end 23 May, 3 days, Utsab Ojha.
Task 2 "Fort Liberty SSO and lease sync spike." Start 21 May, end 27 May, 5 days, Naveen B. Depends on task 1.

Action items:
1. Naveen fix HMC-403 before dress rehearsal — Due 21 May 2026.
2. Utsab publish requirements in Confluence — Due 23 May 2026.

Risks: legacy lease database schema slip may delay nightly sync; garrison demo on 2 June depends on HMC-403.

Dependencies: CRM MVP depends on SSO spike; pilot training depends on CRM MVP. Assumption: Fort Liberty firewall API approval by 25 May.

[End of transcript]`;
