# CodeLah platform

CodeLah is a coding tuition platform for four-student classes in Singapore. Development uses `dev` and follows the phased scope in [documentation.md](documentation.md).

## Current phase

Phase 2 adds Supabase accounts, student username/password login, parent–student links, teacher assignments, enrolments, and access controls. The first administrator has confirmed successful activation. The implementation remains under verification; the student/parent/teacher end-to-end checks are still required. The Phase 1 fictional dashboard remains at `/demo`.

## Run locally

Use Node.js 22.13 or newer (verified with 22.21.0).

```sh
cd web
npm ci
npm run dev
```

Open **http://localhost:3001/login**. The existing local `.env.local` is configured for the selected development project. On another checkout, create `web/.env.local` with:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
APP_ORIGIN=http://localhost:3001
```

`APP_ORIGIN` must match the browser's origin exactly. Add `http://localhost:3001/auth/confirm` to Supabase **Authentication → URL Configuration → Redirect URLs**. If changing the port or hosting domain, update both values. Keep email confirmation enabled. Never put a Supabase secret/service-role key in browser variables; privileged student account operations run in the Supabase function.

### First account

1. Open the login page and expand **First time here? Create an adult account**.
2. Register the reserved administrator email and verify the email from Supabase. Choose your own password; do not share it in chat or source control.
3. The private, one-use administrator reservation activates that verified account automatically.
4. Other adults start pending. An administrator assigns their parent/teacher role, name, and status.
5. The administrator creates student usernames/passwords, then adds parent links, teacher assignments, and enrolments. An authorised parent/teacher may reset their student's password.

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

The PostgreSQL tests use PGlite locally and apply the actual migrations. They do not modify the hosted database. Browser tests cover signed-out login, invalid credentials, origin rejection, and mobile/keyboard access. They do not claim authenticated family/account flows are complete.

## Structure

- `documentation.md`: decisions, progress, verification, and open acceptance items.
- `supabase/migrations/`: versioned accounts, relationships, RLS, usernames, throttling, and initial-admin rules.
- `supabase/functions/student-accounts/`: authenticated student creation/password management. Deploy with JWT verification enabled.
- `web/app/auth/`, `web/app/login/`, `web/app/dashboard/`: real account flows.
- `web/app/demo/`, `web/lib/demo.ts`: fictional Phase 1 experience; refresh resets demo edits.
- `web/tests/`: database permissions and application tests.
- `web/e2e/`: Playwright browser checks.
- `web/.openai/hosting.json`: existing private Phase 1 Sites preview configuration.

The app uses React, TypeScript, and Vinext. Live video, payments, persistent lesson reports, and worksheet submissions are later phases. The existing Sites preview remains Phase 1; Phase 2 currently runs locally and requires separate hosting configuration before external use.

`npm run lint` additionally checks the unused starter catalog and reports 19 existing errors there. Application lint checks CodeLah code. Dependency advisories and pre-pilot hardening are tracked in the project documentation.
