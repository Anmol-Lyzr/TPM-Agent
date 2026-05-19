/**
 * Short HMC (Resident Connect) sample for Workspace → "Load sample".
 * Kept brief so analyze completes within Vercel serverless limits (~2 min).
 */
export const SAMPLE_TRANSCRIPT = `Microsoft Teams recap
Meeting: Hunt Military Communities — Resident Connect Sprint Planning
Date: 20 May 2026 · 2:00 PM ET
Organizer: Sarah Mitchell (TPM)
Participants: Sarah Mitchell, James Rivera (Product), Elena Vasquez (Engineering)

[00:00:10] Sarah Mitchell
Align on Resident Connect pilot at Fort Liberty: digital move-in, CRM timeline, and maintenance intake.

[00:01:00] James Rivera
Decisions: Fort Liberty only for v1; English and Spanish on day one; Hunt Promise photo limit 10 MB in FAQ.

[00:02:00] Elena Vasquez
Bugs for Jira — Issue Type Bug, sprint HMC-ResidentConnect-May:
Bug HMC-401 "Move-in checklist wrong timezone for Hawaii families." Open, High, Elena Vasquez, due 23 May 2026.
Bug HMC-403 "OAuth session expires during lease e-sign on mobile Safari." Open, Critical, Elena Vasquez, due 21 May 2026.

Tasks (not bugs):
Task HMC-120 "Integrate nightly lease sync with alerts." In Progress, High, Elena Vasquez, due 28 May 2026.

Smartsheet schedule:
Task 1 "Finalize product requirements v1.0." Start 20 May, end 23 May, 3 days, James Rivera.
Task 2 "Fort Liberty SSO and lease sync spike." Start 21 May, end 27 May, 5 days, Elena Vasquez. Depends on task 1.

Action items:
1. Elena fix HMC-403 before dress rehearsal — Due 21 May 2026.
2. James publish requirements in Confluence — Due 23 May 2026.

Risks: legacy lease database schema slip may delay nightly sync; garrison demo on 2 June depends on HMC-403.

Dependencies: CRM MVP depends on SSO spike; pilot training depends on CRM MVP. Assumption: Fort Liberty firewall API approval by 25 May.

[End of transcript]`;
