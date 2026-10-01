---
project: codelah-platform
status: active
summary: Workspace and admin migrations applied to hosted Supabase; student-accounts deploy, hosted verification and merge to dev remain pending.
updated: 2026-10-01
---

## Milestones
- [x] Phase 3 teaching workflow  done:2026-09-24  ^m-03
- [ ] Phase 4 live classroom (Daily)  start:2026-09-28  ^m-04
- [ ] Hosted rollout of workspace and admin overhaul  ^m-05

## Now
- [x] Publish all platform changes and verify the GitHub feature branch  prio:high done:2026-09-30  ^t-0011
- [x] Apply 202609290001_learning_workspace and 202609290002_admin_operations migrations to hosted Supabase (backup skipped by decision)  prio:high done:2026-10-01  ^t-0001
- [ ] Deploy student-accounts function (JWT on), set CODELAH_APP_ORIGIN, install invite email template  prio:high  ^t-0002
  - [x] Function deployed and CODELAH_APP_ORIGIN set (2026-10-01)
  - [ ] Add http://localhost:3001/auth/confirm to Supabase redirect URLs
  - [ ] Install invite email template (blocked: needs custom SMTP)
- [ ] Verify one adult invitation end to end and fee/expense/roster flows on hosted  prio:high  ^t-0003

## Next
- [ ] Merge feat/learning-workspace-overhaul into dev  ^t-0004
- [ ] Teacher creates real courses/levels/objectives and uploads worksheets  ^t-0005
- [ ] Hosted teacher/student/parent cycle check (worksheets, attendance, .py upload, revocation)  ^t-0006
- [ ] Rescheduled live classroom check on Daily (five-person call verified 2026-10-01; rescheduling not yet tested)  ^t-0007

## Later
- [ ] Payments (currently a manual ledger)  ^t-0008
- [ ] Practise feature  ^t-0009
- [ ] Pre-pilot hardening and dependency advisories  ^t-0010

## Blockers
- Working SMTP needed for adult signup/recovery emails. Supabase locks email template editing while the project uses its built-in sender, and the default invite email links in a format /auth/confirm cannot read, so adult invitations (t-0002, t-0003) stay blocked until custom SMTP is set (e.g. Resend, Brevo or Google Workspace for codelah.sg). Student accounts are unaffected.

## Log
### 2026-10-01
- Removed the Daily API key blocker: DAILY_API_KEY is set in web/.env.local and was verified against Daily on 2026-09-28 (364f025). The first real multi-user classroom trial is still pending.
- Decided to use the single hosted Supabase project for development; no separate dev database during the dev phase.
- Linked the Supabase CLI to project tcequgfvwzfbxawclyum. The six earlier migrations had been applied from the dashboard under timestamp IDs, so the history was repaired to the repo file IDs (202609160001 through 202609240002); no schema changed during the repair.
- Applied 202609290001_learning_workspace and 202609290002_admin_operations with `supabase db push`, with no pre-migration backup (team decision). Verified that both show as applied and that courses, worksheets, lesson_roster, student_payments, admin_expenses and admin_audit respond via the REST API.
- t-0002 in progress: set the CODELAH_APP_ORIGIN secret to http://localhost:3001 (the app runs only locally for now; change it when the app is hosted) and deployed student-accounts (now version 3, JWT verification confirmed by a 401 on an unauthenticated call). Still to do in the dashboard: add the /auth/confirm redirect URL and install the invite email template.
- Invite template could not be edited: Supabase locks templates without custom SMTP. Parked the invitation work behind the SMTP blocker until an email provider is chosen.
- Added web/e2e/live-classroom.spec.ts: an automated five-person Daily check with throwaway QA accounts (teacher, four students, parent, spare teacher), cleaned up after each run. First runs: class, lesson, roster and private Daily room (5-person cap) all worked and the join route issued tokens, but Daily refused the call with account-missing-payment-method. Added as a blocker.
- Payment method added to Daily; blocker cleared. The test then confirmed a real bug: the video frame stayed at zero height during Daily's pre-join check, so nobody could press Join. Fixed in components/lessons/daily-classroom.tsx (frame visible while joining). live-classroom.spec.ts now passes: five people join (Daily presence = 5), only the teacher has Share, a parent gets the not-found page and a 403 from the join route, and a sixth person is refused. 65 unit tests, typecheck and lint pass. Follow-up: the refused sixth person and Daily errors only show the generic "The classroom could not be opened."

### 2026-09-30
- Published the workspace/admin overhaul to origin/feat/learning-workspace-overhaul (c64ff9b), set upstream tracking, and verified the GitHub ref. All 65 tests, TypeScript, application lint, production build, and staged diff checks passed; browser and hosted acceptance were not rerun. Merge and hosted rollout remain pending.
- Tracker created from README and docs/*-overhaul.md rollout notes
