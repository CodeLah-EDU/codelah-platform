# Administration overhaul

Continues `feat/learning-workspace-overhaul`. The earlier instruction to leave administration unchanged is superseded by the founder's administrator-overhaul request.

## Plan

1. Build a shared, responsive administration shell using the supplied Codelah palette, DM Sans, IBM Plex Mono, and approved wordmark. Prioritise Overview, Finances, Attendance, Accounts, and Classes.
2. Add an operational overview with actionable overdue balances, unmarked attendance, account requests, and upcoming classes.
3. Consolidate student fees, paid business expenses, monthly cash profit (payments received minus expenses paid), period comparisons, filters, CSV exports, and change history. Keep amounts in integer SGD cents. Reuse the existing student payment records so family and teacher views remain consistent.
4. Add an attendance register with date/class/status filters, per-lesson rosters, individual notes, and an atomic save for a complete register. Never count unmarked or excused records as absences, or include future/cancelled classes in attendance rates.
5. Make accounts searchable by name, username, and verified contact email. Add dedicated records with account access, family connections, class assignments, student balances, and attendance history. Retain many-to-many families, student provisioning/password resets, and four-student classes. Add adult invitations through the privileged Supabase function, with verification and administrator activation.
6. Provide read-only fictional administrator previews. Verify the UI on desktop/mobile, the real migrations and permissions locally, calculation/date/export edge cases, and origin/authentication boundaries.

## Rollout boundaries

No hosted database changes, invitations, or real financial records are made during development. Finance summaries describe recorded cash activity; no payment collection or tax accounting is introduced. Hosted rollout requires the learning-workspace migration, the new administrator migration, and deployment/configuration of the updated account function. Keep existing authentication and role checks authoritative.

## Implemented

- Shared administration shell at `/admin`, including responsive navigation, account search, error states, keyboard-accessible dialogs, original brand leaf geometry, DM Sans/IBM Plex Mono, and the supplied forest/lime palette.
- Overview: payments received, cash profit, overdue fees, attendance rate, actionable missing attendance/account requests, six-month chart, upcoming lessons, and overdue student records.
- Finances: student fee creation/editing/deletion, pending/paid/waived statuses, derived overdue state, expense categories/supplier/reference/notes, monthly cash summary, search/date/status filters, pagination, filtered CSV exports, and the latest 200 finance changes with before/after values. All persisted money uses integer SGD cents; profit uses payment receipt and expense payment dates. Outstanding/waived fees do not inflate cash income. Fee records represent full payments; partial-payment allocation, refunds, automated invoices, payment processing, and accrual/tax reports are outside this change.
- Attendance: class/date/status search, individual student history, per-lesson status and notes, mark-unmarked-present shortcut, atomic whole-register save, and CSV export. Rates use present + late over present + late + absent for ended, non-cancelled lessons. Excused and unknown entries remain separate. Future/cancelled registers cannot be edited.
- Accounts: searchable directories with role/status filters, requests, student creation and password resets, adult invitations, verified-email activation, suspension, profile editing, student balances and attendance, class links, and many-to-many parent/child relationships. Contact emails are taken from verified account records; role selection never grants authorization.
- Classes: four-student recurring enrolments, teacher assignments, archive/reactivate, lesson registers, and lesson scheduling/editing/rescheduling/cancellation within the administration console. Existing snapshots preserve historical lesson rosters when recurring enrolments change.
- The `/admin/students`, `/admin/parents`, `/admin/teachers`, `/admin/adults`, and existing class URLs remain usable. Previous legacy lesson tools remain at `/dashboard/lessons`.
- `/preview/admin` uses fictional data. Forms open and validate, but preview changes never reach the backend or send email. Its CSV exports contain fictional data only.

## Local verification — 29 September 2026

- TypeScript, application lint, and production build pass.
- 65 application/database tests pass. The PGlite tests execute real migrations, including admin-only expense/history permissions, suspended-user denial, immutable audit history with actor attribution, exact cents/date calculations, formula-safe CSV, atomic attendance rollback and roster validation. Existing account, family, worksheet, objective, file, calendar, and live-classroom tests remain passing.
- The actual invitation Edge Function runs in a local test harness with mocked Auth/database adapters. Tests cover administrator-only access, pending status, trusted redirect configuration, malformed input, and provider/profile failure handling. No email is sent by this harness.
- 25 Chromium browser tests pass across sign-in and all role previews. Nine cover administration: fee search/filter/export/edit, expense entry, attendance selection, many-to-many families, class controls, scheduling/editing, mutation origin/authentication checks, keyboard dialogs/navigation, and desktop/mobile rendering. Thirteen administrator views are checked at 1440px and 390px without page overflow or runtime errors. Screenshots are in ignored `web/test-results/`; desktop overview/finances, mobile records/expenses, and administrator sign-in were visually reviewed.
- The opt-in authenticated administrator test was updated for the new UI, but was not run against the hosted project. Real account invitations, authenticated new financial CRUD, and hosted migration acceptance remain rollout checks.

## Hosted rollout

1. Review/back up the project and its migration history. Apply `202609290001_learning_workspace.sql` after the existing migrations, then `202609290002_admin_operations.sql`. Review the first migration's historical roster backfill as documented in the workspace notes. Do not seed the fictional preview records.
2. Deploy the application with its existing Supabase settings and exact `APP_ORIGIN`. Deploy the updated `supabase/functions/student-accounts/index.ts` with JWT verification enabled. Set the Edge Function secret `CODELAH_APP_ORIGIN` to the same application origin (HTTPS in production). Supabase supplies the service credential only inside the function.
3. Add `<application-origin>/auth/confirm` to Supabase's permitted redirect URLs. Copy `supabase/templates/invite.html` into **Authentication → Email Templates → Invite user**. The template passes `token_hash` and `type=invite` to the existing server confirmation handler, which establishes the session before password setup. The redirect variable is set by the server's configured origin. This follows Supabase's [server-side email template guidance](https://supabase.com/docs/guides/auth/auth-email-templates). Verify SMTP/delivery before issuing a real invitation.
4. Test one designated adult invitation through email verification, password setup, administrator activation, and role-correct sign-in. If role setup failed after an email was sent, the account remains pending and the UI explicitly asks the administrator to review it.
5. With designated test records, verify fee/expense CRUD and audit history, student/parent fee visibility, administrator-only expenses, roster saves, suspended-user denial, enrolment capacity, and family unlink revocation. Remove or void only those designated test financial records; deletions remain in audit history.

## Preview

Run `npm run dev` in `web/`, then open `http://localhost:3001/preview/admin`. Real administrators enter at `/admin/login`. Published to GitHub on `feat/learning-workspace-overhaul` on 30 September 2026 (c64ff9b); deployment and hosted rollout remain pending.
