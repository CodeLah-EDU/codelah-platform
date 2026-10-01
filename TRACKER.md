---
project: codelah-platform
status: active
summary: Hosted Supabase is up to date and the five-person classroom (with chat) works; adult invitations wait on SMTP, and hosted cycle checks and the merge to dev remain.
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

- [x] Restore student password reset for parents (not teachers) in the workspace, visible to admins  prio:high done:2026-10-01  ^t-0012
- [x] Teacher workspace polish: no count boxes on home, Classroom button opens the call directly, compact roster and class notes, full-screen button and class chat for everyone in the call  done:2026-10-01  ^t-0014
- [ ] Hosted fee/expense CRUD and audit check (no automated test saves real fees or expenses yet)  ^t-0013

## Next
- [ ] Merge feat/learning-workspace-overhaul into dev  ^t-0004
- [ ] Teacher creates real courses/levels/objectives and uploads worksheets  ^t-0005
- [ ] Hosted teacher/student/parent cycle check (worksheets, attendance, .py upload, revocation)  ^t-0006
  - [ ] Rewrite the lesson-cycle half of e2e/teaching-flow.spec.ts for the workspace pages; it still drives the old /dashboard/lessons/[id] page, where publishing feedback did not reach the parent in the 2026-10-01 run. Decide whether to retire that old page.
- [ ] Rescheduled live classroom check on Daily (five-person call, chat and full screen verified 2026-10-01; rescheduling not yet tested)  ^t-0007

## Later
- [ ] Payments (currently a manual ledger)  ^t-0008
- [ ] Practise feature  ^t-0009
- [ ] Pre-pilot hardening and dependency advisories  ^t-0010

## Blockers
- Working SMTP needed for adult signup/recovery emails. Supabase locks email template editing while the project uses its built-in sender, and the default invite email links in a format /auth/confirm cannot read, so adult invitations (t-0002, t-0003) stay blocked until custom SMTP is set (e.g. Resend, Brevo or Google Workspace for codelah.sg). Student accounts are unaffected.

## Log
### 2026-10-01
- t-0012: parents can reset their child's password again from the Student page (Reset password button). Founder update to D010: parents and admins only; teachers are now refused by the student-accounts function. Every reset is recorded in the new student_password_changes table (migration 202610010001, applied) and listed under "Password changes" on the admin's student record. Function redeployed; unauthenticated calls still get 401.
- t-0014 teacher changes: removed the three count boxes from the teacher home; the Classroom button now opens the video page directly, which joins straight away (the teacher's first visit creates the Daily room, so "Prepare live classroom" is no longer needed; students who arrive first are told to wait). The class page roster is one line per student with attendance in a pop-up, and class notes are one compact list with writing in a pop-up. The call has Full screen and Hide/Show chat buttons; the chat panel lets teachers (room owners) post text that students can read and copy, with a catch-up for late joiners. Messages are not saved after the call.
- Follow-up: everyone in the call can now chat, not just the teacher. Names come from Daily's participant record (set by the server-issued token), so nobody can post as someone else; teacher messages are highlighted and marked "(teacher)". Removed the "Latest class notes" panel from the teacher home; "Coming up" now uses the full width. live-classroom.spec.ts passes again (a student's message reaches everyone under their own name); workspace tests and 65 unit tests pass.
- Tests: live-classroom.spec.ts passes with the new flow (student waits for teacher, chat reaches all four students incl. catch-up, students cannot post, full screen toggles). 26 other browser tests and 65 unit tests pass. teaching-flow.spec.ts now passes its password steps (parent UI reset, teacher refused, admin record) but fails later on the old lesson page (see t-0006).
- Ran the full Playwright suite against the hosted project: 23/28 passed at first. Fixed three date-dependent failures (preview fees were due on the 1st, so none were overdue on 1 Oct; the calendar drag test needed a taller window when tomorrow's class is in the top row) and admin-flow (new contexts inherited the admin session and /login now redirects signed-in users). admin-flow now passes against hosted: class, enrolment, teacher, parent link, student sign-in and revocation. teaching-flow still fails: it resets a student password from the parent's old /dashboard page, which the workspace redirect made unreachable (t-0012).
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
