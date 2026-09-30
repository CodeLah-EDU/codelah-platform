# Learning workspace overhaul

Branch: `feat/learning-workspace-overhaul`, based on `dev` at `28887f1`.
Design source: supplied Codelah Brand Guidelines v1.7, 25 September 2026.

## Implementation plan

1. Preserve authentication, admin routes, and the existing live classroom. Add a shared, responsive workspace with dedicated student, teacher, and parent navigation.
2. Add a private worksheet library with tags, search, grid/list layouts, course/level/access filters, teacher uploads, metadata editing, deletion, and individual unlock/revoke controls. Keep locked metadata visible; never send locked file content or storage links. Restricted worksheets are teacher-only.
3. Add courses, levels, objectives, student course selections, and teacher-managed completion records. Students and parents see read-only progress. Teachers can maintain the curriculum.
4. Snapshot lesson rosters independently of recurring class enrolments. Teachers can drag or select students into scheduled lessons, remove assignments, and edit lesson times. Serialize capacity checks in PostgreSQL (maximum four) and reject overlapping student bookings. Preserve historical rosters when recurring enrolments change.
5. Build month/list calendars in Singapore time, with orange upcoming, red missed, green attended, and labelled neutral unmarked/cancelled states. Lesson details contain published teacher reports, student comments, private files, and the existing classroom entry point.
6. Build teacher student records with overview, calendar, timeline, worksheet assignments, and objective tracker. Overview includes linked parents, profile, attendance, and manually recorded payment information. No payment collection is introduced. Existing many-to-many parent links remain the source of truth.
7. Give parents a child switcher and read-only student records (no worksheet assignment tab or mutation controls). Provide students with a lesson-organised file library and a clearly deferred Practise page.
8. Make `/` and `/login` the platform sign-in gateway, reached from the founder's separate marketing site. Use the supplied wordmark and sprout/leaf geometry, forest and paper colours, self-hosted fonts, and a garden that animates when Student, Parent, or Teacher is selected. Keep Administrator in the corner and expose the three existing previews through a demo dialog. Preserve real authentication, recovery, registration, and role-based routing.
9. Validate actual migrations and RLS with PGlite; cover family isolation, lock/revoke/restricted storage access, teacher permissions, capacity, overlap, and read-only parents. Run typecheck, application lint, unit/database tests, production build, and desktop/mobile browser checks.

## Boundaries and rollout

- The initial workspace phase preserved `/admin`. The subsequent administrator-overhaul request supersedes this boundary; see [administrator notes](admin-overhaul.md).
- New schema is an additive versioned migration. Hosted rollout is separate from local implementation; do not silently apply schema changes to the shared project.
- Existing lessons are backfilled from their current active class enrolments. Review this baseline against any historical membership changes during rollout; the old schema did not store per-lesson rosters. Future lessons snapshot their class roster on creation. Calendar assignment is per lesson, not a silent change to all past or future classes.
- Locked means discoverable title/tags, with content unavailable until assigned. Already downloaded copies cannot be recalled.
- Parent links and verified parent emails remain managed by existing account workflows; teachers may read the parents linked to their students.
- No real curriculum completion, payment, attendance, or testimonial is invented. Preview data is fictional and separate from authenticated data.

## Verification record

Completed locally on 29 September 2026:

- TypeScript, application lint (expanded to include the new components), and production build pass.
- 55 unit/database tests pass. The PGlite suite applies the real migrations and tests past-roster backfill, future snapshots, capacity and overlap checks, parent/teacher isolation, many-to-many family links, worksheet metadata/content/storage separation, unlock/revoke, restricted visibility, objective enrolment validation, comment ownership, and feedback withdrawal.
- 16 Playwright tests pass across the new workspace and signed-out account flows: worksheet search/filter/layout controls, teacher scheduling dialogs, actual drag/drop events and roster selection, parent child switching, read-only family views, lesson notes/files, origin rejection, and mobile navigation. The sign-in follow-up also checks keyboard profile selection, password visibility/reset on profile change, failed-login profile retention, adult recovery, demo dialog focus/links, and reduced motion.
- 14 routes checked at 1440px and 390px, without runtime errors or page-level horizontal overflow. The month grid scrolls within its own container on narrow screens; Agenda is also available. The full browser suite generates screenshots in the ignored `web/test-results/` directory. Landing, library, calendars, progress, home, and mobile layouts were visually reviewed.
- At the end of this initial phase, admin page/component/CSS files were unchanged. They were subsequently redesigned in the administrator follow-up. Dependency restoration did not change package versions.
- Rescheduled lessons synchronise their Daily opening/expiry window before issuing join tokens; provider requests are mocked in tests. No live room or call was created by this work.

## Review locally

Run `npm run dev` in `web/` and open:

- `/` or `/login`: animated platform sign-in page and **Try a demo** chooser.
- `/preview/student/home`: student workspace.
- `/preview/teacher/calendar`: teacher calendar and assignment view.
- `/preview/parent/home`: parent workspace and child switcher.

Previews use explicitly fictional data and block writes/downloads. Authenticated accounts enter at `/dashboard/home`. The old `/demo` and legacy lesson/classroom tools remain available.

## Hosted rollout still required

1. Back up and review the selected project's current migration history and enrolments. Apply `supabase/migrations/202609290001_learning_workspace.sql` after the existing account, teaching-workflow, lesson-file, and live-classroom migrations. This creates the private `worksheet-library` bucket and policies as well as the new tables; it does not upload any local worksheets.
2. Deploy this branch with the existing Supabase and `APP_ORIGIN` configuration. No additional secret is required for the new workspace.
3. Have a teacher create the real courses, levels, and objectives through a student record's **Objective tracker → Manage curriculum**, then assign courses and upload real worksheets. Fictional preview records are not seeded into the database.
4. Verify an authenticated teacher/student/parent cycle on the hosted project: upload/open/unlock/revoke a worksheet; assign four students and reject the fifth; edit attendance and publish/withdraw a note; upload and retrieve a student `.py` file; switch between linked children and verify revocation.
5. Verify a rescheduled live classroom using the configured Daily project. The existing live-call acceptance requirements remain outstanding.

The shared Supabase database was not modified, and this branch was not published or deployed. Payment information is a manual ledger; payment collection is not implemented. Practise deliberately remains a future-feature page, as requested.

## Platform sign-in follow-up

The marketing site remains separate. Its platform link should point to the deployed root URL. `/` and `/login` share the same dynamic sign-in page; signed-in visitors continue through `/dashboard`, which resolves their saved role and account status. Selecting a profile changes the credential form and garden animation only; it never changes permissions. Students use their username, adults use their email, and administrators retain `/admin/login`.

The demo dialog links directly to the three previews listed above, without fabricating a session. Native radio controls support arrow keys, the dialog restores focus on Escape/close, and reduced-motion preferences disable the plant and selection animations. The logo stylesheet loads with the page to avoid shifting during hydration. Worksheet search and filter controls also wait for hydration so early input cannot be lost.

No live account was created, no recovery email was sent, and no hosted schema was changed for this follow-up. Successful authenticated workspace acceptance remains part of the hosted rollout above.

## Implementation references

- Supabase [Storage access control](https://supabase.com/docs/guides/storage/security/access-control): private bucket policies are tested separately from worksheet metadata. Downloads proxy authenticated storage requests and send `private, no-store`, so each new request rechecks access.
- Daily [Set Room Config](https://docs.daily.co/reference/rest-api/rooms/update-room): synchronise room configuration with the saved lesson before joining.
