---
project: codelah-platform
status: active
summary: Workspace and admin overhaul verified for GitHub publication on feat/learning-workspace-overhaul; hosted deployment and migrations remain pending.
updated: 2026-09-30
---

## Milestones
- [x] Phase 3 teaching workflow  done:2026-09-24  ^m-03
- [ ] Phase 4 live classroom (Daily)  start:2026-09-28  ^m-04
- [ ] Hosted rollout of workspace and admin overhaul  ^m-05

## Now
- [ ] Publish all platform changes and verify the GitHub feature branch  prio:high  ^t-0011
- [ ] Back up hosted Supabase, apply 202609290001_learning_workspace and 202609290002_admin_operations migrations  prio:high  ^t-0001
- [ ] Deploy student-accounts function (JWT on), set CODELAH_APP_ORIGIN, install invite email template  prio:high  ^t-0002
- [ ] Verify one adult invitation end to end and fee/expense/roster flows on hosted  prio:high  ^t-0003

## Next
- [ ] Merge feat/learning-workspace-overhaul into dev  ^t-0004
- [ ] Teacher creates real courses/levels/objectives and uploads worksheets  ^t-0005
- [ ] Hosted teacher/student/parent cycle check (worksheets, attendance, .py upload, revocation)  ^t-0006
- [ ] Rescheduled live classroom check on Daily  ^t-0007

## Later
- [ ] Payments (currently a manual ledger)  ^t-0008
- [ ] Practise feature  ^t-0009
- [ ] Pre-pilot hardening and dependency advisories  ^t-0010

## Blockers
- Daily API key needed before real classroom calls
- Working SMTP needed for adult signup/recovery emails

## Log
### 2026-09-30
- Prepared the workspace/admin overhaul for GitHub; 65 tests, TypeScript, application lint, production build, and diff checks passed. Hosted rollout remains separate.
- Tracker created from README and docs/*-overhaul.md rollout notes
