# CodeLah platform

CodeLah is a coding tuition platform for four-student classes in Singapore. Development uses `dev` and follows the phased scope in [documentation.md](documentation.md).

## Current phase

The `feat/learning-workspace-overhaul` branch adds a plant-themed sign-in gateway and dedicated student, teacher, and parent workspaces, with a worksheet library, course objectives, calendars, per-lesson rosters/files/comments, family timelines, and manual payment records. See [workspace implementation and rollout notes](docs/workspace-overhaul.md).

Administration has also been redesigned around student fees, business expenses, monthly cash profit, attendance, account creation, family connections, and class management. See [administrator implementation and rollout notes](docs/admin-overhaul.md). The two new database migrations are verified locally but have **not** been applied to the shared Supabase project. The **Try a demo** button at `/` opens the student, teacher, and parent previews. The administrator sign-in at `/admin/login` links to the read-only administrator preview at `/preview/admin`.

Phase 3 now has a weekly dashboard, saved lesson schedule, private worksheet and project files, text submissions, attendance, and published family reports at `/dashboard/lessons`. Phase 2 live sign-in, relationship, password reset, and revocation checks are underway; the founder confirmed delivery of a recovery email. The Phase 1 fictional dashboard remains at `/demo`.

Phase 4 has started with a Daily Prebuilt integration behind server-side configuration. The source includes private room preparation, short-lived per-user joining credentials, a five-person limit, teacher screen sharing, and the embedded classroom page. The live-classroom Supabase migration is applied; a Daily API key is still required before real calls can start.

## Run locally

Use Node.js 22.13 or newer (verified with 22.21.0).

```sh
git clone --branch dev https://github.com/CodeLah-EDU/codelah-platform.git
cd codelah-platform/web
cp .env.example .env.local
npm ci
npm run dev
```

Open **http://localhost:3001/** for the platform sign-in page; `/login` provides the same experience. Choose Student, Parent, or Teacher, or use the Administrator link in the corner. **Try a demo** opens the fictional workspace previews without an account. Successful sign-in follows the verified account role. The earlier prototype remains at `/demo`.

The committed `.env.example` contains only the Supabase project URL and publishable browser key. It does not contain a service-role key or password. Keep personal passwords and any future server secrets outside Git.

`APP_ORIGIN` must match the browser's origin exactly. Add `http://localhost:3001/auth/confirm` to Supabase **Authentication → URL Configuration → Redirect URLs**. If changing the port or hosting domain, update both values. Keep email confirmation enabled. Never put a Supabase secret/service-role key in browser variables; privileged student account operations run in the Supabase function.

### First account

1. Open the login page, select **Parent** or **Teacher**, and expand **First time here? Create an adult account**.
2. Register the reserved administrator email and verify the email from Supabase. Choose your own password; do not share it in chat or source control.
3. The private, one-use administrator reservation activates that verified account automatically.
4. Administrators use `/admin` with a separate sidebar; `/admin/login` is the dedicated sign-in. Other adults start pending; assign their roles under **Account requests**. Assigned accounts appear on separate **Parents** and **Teachers** pages.
5. Use **Accounts → Create account** for student usernames/passwords or parent/teacher invitations. Adult invitations require the configuration in the administrator rollout notes. Use **Classes → Create class** for enrolments and teacher assignments, and **Family connections** for families. Each student record shows parent contact details, fees, and attendance. An authorised parent/teacher may still reset their student's password.

The selected project has its first-admin reservation configured. A fresh project needs a deliberate privileged reservation after applying migrations; the repository does not grant admin based on user-editable metadata. Supabase email delivery/SMTP must work for adult signup and recovery.

## Verify

From `web/`:

```sh
npm run typecheck
npm run lint:app
npm test
npm run build
# With the development server running:
npx playwright install chromium
npm run test:e2e
```

The PostgreSQL tests use PGlite locally and apply the actual migrations. They do not modify the hosted database. Browser tests cover signed-out login, invalid credentials, origin rejection, and mobile/keyboard access. The opt-in `e2e/admin-flow.spec.ts` also verifies authenticated class enrolment, parent links, teacher assignment, student sign-in, and access revocation. Run it only with an explicitly authorized administrator storage-state file outside the repository via `CODELAH_ADMIN_STATE=/absolute/private/path/admin.json npm run test:e2e -- e2e/admin-flow.spec.ts`. It creates real labelled QA fixtures, removes its class, and suspends its QA accounts; Auth identities remain. It does not test adult email onboarding or recovery. The separate `e2e/teaching-flow.spec.ts` exercises student password resets and the lesson cycle with the same opt-in session. Keep that session file private and never commit it.

## Structure

- `documentation.md`: decisions, progress, verification, and open acceptance items.
- `supabase/migrations/`: versioned accounts, relationships, RLS, usernames, throttling, and initial-admin rules.
- `supabase/functions/student-accounts/`: authenticated student creation/password management and administrator-only adult invitations. Deploy with JWT verification enabled.
- `web/app/auth/`, `web/app/login/`, `web/app/dashboard/`: real account flows.
- `web/app/demo/`, `web/lib/demo.ts`: fictional Phase 1 experience; refresh resets demo edits.
- `web/tests/`: database permissions and application tests.
- `web/e2e/`: Playwright browser checks.
- `web/.openai/hosting.json`: existing private Phase 1 Sites preview configuration.
- `DAILY_API_KEY`: optional server-only Daily credential for the Phase 4 classroom; keep it in `.env.local` and never commit it.

The app uses React, TypeScript, and Vinext. Phase 4 live video is implemented behind provider configuration, while payments remain a later phase. Phase 3 worksheet links, text responses, and private files use the connected Supabase project; uploaded files are limited to 10 MB and downloads use short-lived signed links. The existing Sites preview remains Phase 1; the account, lesson, and classroom workflows currently run locally and require separate hosting configuration before external use.

`npm run lint` additionally checks the unused starter catalog and reports 19 existing errors there. Application lint checks CodeLah code. Dependency advisories and pre-pilot hardening are tracked in the project documentation.
