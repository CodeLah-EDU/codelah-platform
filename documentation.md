# CodeLah platform — project documentation

Last updated: 2026-09-19

## 1. Purpose

Build an online coding tuition platform for primary and secondary school students in Singapore. Students attend live classes and access worksheets; teachers manage lessons and feedback; parents see their children's learning updates and manage payments.

The core teaching cycle is: scheduled lesson → live class → worksheet and student work → teacher feedback → parent update.

## 2. Confirmed decisions

| ID | Decision | Date |
| --- | --- | --- |
| D001 | Customer-facing brand is **CodeLah**, replacing the reference website's working name, ClassCode. | 2026-09-15 |
| D002 | Platform repository is `CodeLah-EDU/codelah-platform`. | 2026-09-15 |
| D003 | Use `dev` for development. | 2026-09-15 |
| D004 | Work in phases, communicating and agreeing on each phase with the founder. | 2026-09-15 |
| D005 | Start with the student, teacher, and parent dashboard prototype. | 2026-09-15 |
| D006 | Follow the font and design guidelines in `CodeLah-EDU/codelah`. | 2026-09-15 |
| D007 | Classes have four students, with sessions lasting 90–120 minutes. | 2026-09-15 |
| D008 | Proceed with Phase 2: real accounts, relationships, and access controls. | 2026-09-16 |
| D009 | Use the founder-provided Supabase project `tcequgfvwzfbxawclyum` for Phase 2; inspect existing data and environment before changes. | 2026-09-16 |
| D010 | Students sign in with a username and password; their linked parent or assigned teacher manages account setup and recovery. | 2026-09-16 |
| D011 | Reserve `hello@codelah.sg` as the first administrator; activate after verified email through a one-use reservation. | 2026-09-16 |

The platform source is developed on `dev`, with `origin` pointing to the CodeLah-EDU GitHub repository. A private Sites review deployment uses a separate source snapshot; its hosting branch does not change the development branch. GitHub publication is tracked separately from the preview deployment.

## 3. Design reference

Reference repository: [CodeLah-EDU/codelah](https://github.com/CodeLah-EDU/codelah).

Reviewed revision: `5ab06f1581e6e363e6688281dcfa6aef601f54e2`.

Sources: `classcode_astra_build_brief.md`, `docs/CONTENT.md`, `docs/ARCHITECTURE.md`, `src/styles/tokens.css`, and `src/config/brand.ts`.

| Element | Direction |
| --- | --- |
| Interface font | Self-hosted DM Sans Variable |
| Code and selected labels | Self-hosted IBM Plex Mono |
| Canvas | Warm off-white, `#f7f7f0` |
| Main text | Deep green, `#202e26` |
| Muted text | `#596451` |
| Borders | `#dce0d3` |
| Accent | Lime, `#c6f568` |
| Secondary accent | Coral, `#ef9a7c` |
| Character | Original Bracket SVG, used sparingly |

Use readable 16–18px body text, 14px supporting text, and 12px short captions at the default root size. Navigation and primary controls use 16px text; primary controls are at least 48px high. Check contrast for actual colour pairings, provide visible keyboard focus, and respect reduced-motion preferences.

Keep the interface calm and practical for parents, and welcoming to students without looking childish. Keep brand configuration separate from UI components. Reference decorative greenery can be used selectively where it does not compete with lesson content.

The reference site describes ages 10–17. The platform's exact age eligibility has not been confirmed; do not treat this reference range as a newly approved business rule.

## 4. Phase roadmap

| Phase | Outcome | Status |
| --- | --- | --- |
| 1 — Dashboard prototype | Review the student, teacher, and parent experience with fictional sample lessons. | Founder approved moving to Phase 2; browser verification remains outstanding |
| 2 — Accounts and access | Real authentication, parent–child links, teacher assignments, and enforced permissions. | Implemented locally; administrator activation confirmed, remaining authenticated checks pending |
| 3 — Teaching workflow | Persistent schedules, worksheets, submissions, attendance, and teacher feedback. | In progress — lesson records and scheduling slice implemented |
| 4 — Live classroom | Embedded video and screen sharing linked to scheduled lessons. | Proposed; provider undecided |
| 5 — Payments and pilot | SGD billing, receipts, and a small operational pilot. | Proposed |

Review each phase together before expanding scope. The founder can revise the order. Phase completion requires a working demonstration and appropriate verification, with remaining limitations recorded here.

## 5. Phase 1 — dashboard prototype

### Objective

Make the core teaching cycle understandable from all three perspectives before integrating accounts or external services. This is a clearly labelled demonstration using fictional data.

### Screens and interactions

| View | Included in the prototype |
| --- | --- |
| Student | Upcoming lesson and Singapore time, lesson objective, classroom-preview entry, worksheet access, and published feedback. |
| Teacher | Class schedule and fictional roster, sample attendance controls, worksheet preview, and a weekly feedback form. |
| Parent | Linked fictional child summary, attendance, topics covered, teacher feedback, and suggested practice. |
| Classroom preview | Static preview of the planned call area and lesson materials, clearly marked as a demonstration. |

Provide a clearly labelled demo role switcher so the founder can review each perspective. It is not authentication or a permission boundary.

Use one shared fictional cohort of four students and consistent lesson records across the views. Assume one teacher for prototype planning. Include an upcoming lesson and a completed lesson, lasting 90–120 minutes each, so both joining and weekly reporting can be reviewed. Use sample names and dates without inventing actual enrolments, prices, or policies.

Proposed review interaction: edit attendance and a weekly note in the teacher view, select **Publish demo update**, then switch to the parent view and see that same update. Keep draft feedback separate from published feedback. Prototype changes remain in browser memory and reset on refresh; disclose this visibly.

### Scope boundaries

- No real login, database, or real student information in Phase 1.
- Classroom preview does not request camera or microphone access or start a video call.
- Worksheets use sample content; real file uploads, persistent submissions, and an executable code editor come later.
- Payments, recordings, messaging, certificates, and administrative enrolment tools are outside this phase.
- The public marketing website remains a separate repository; Phase 1 focuses on the portal.

### Acceptance checklist

- [x] CodeLah name and documented fonts/colours are applied in the source; visual review remains pending.
- [ ] Student, teacher, and parent views are navigable through the demo role switcher.
- [x] Shared lesson data supplies all views; automated checks verify Singapore times and the four-student cohort.
- [ ] A student can open the sample worksheet and the labelled classroom preview.
- [ ] A teacher can update sample attendance and publish a demo weekly note.
- [ ] The parent view displays the corresponding published update for the linked fictional child.
- [x] Automated state-transition tests verify draft/published separation and independent per-child reports.
- [ ] Demo status and refresh/reset behaviour are clear.
- [ ] Desktop and mobile layouts, keyboard use, and relevant empty/error states are checked.
- [x] Production build, TypeScript, application lint, and four state-transition tests pass. Browser interaction checks remain pending.
- [x] Founder agreed to proceed to Phase 2 on 2026-09-16; this does not substitute for the outstanding browser checks.

## 6. Phase 3 — teaching workflow

### Teaching cycle now implemented locally

- Teachers and administrators schedule a lesson in Singapore time for an assigned class. Duration is limited to the agreed 90–120 minutes at both the form handler and database constraint. Teachers can mark lessons completed or cancelled.
- Teachers add worksheet instructions and optional HTTP(S) worksheet links. Students see these beside the lesson and can submit or revise a text response. Teachers can review the response without rewriting the student's work.
- Teachers record attendance and a note per student. Family members see only their own child's attendance and submission.
- Teachers save private feedback drafts and publish a report for each student. A later draft does not change the last published family report; publishing again updates that child's report. Linked parents and students see published reports only.
- The `202609200001_teaching_workflow.sql` migration was applied to the selected Supabase project after inspecting its migration list and confirming the lesson tables were absent. Source and project use the same ordered account and lesson schemas.
- Browser routes: `/dashboard/lessons`, `/dashboard/lessons/new`, and `/dashboard/lessons/[id]`. Admins can open the lesson schedule from their sidebar.
- The main student/parent dashboard now shows the next three scheduled lessons and the latest three published teacher updates. The full schedule separates upcoming lessons from previous and cancelled lessons.
- PostgreSQL tests cover classmates' record isolation, unpublished draft privacy, immutable published snapshots, forged review attempts, teacher changes to student submissions, cancelled lessons, role and relationship revocation, invalid durations, and unsafe worksheet URLs.

### Remaining Phase 3 work

- Finish a live teacher–student–parent browser cycle and desktop/mobile review with QA accounts, including revocation.
- Decide whether file uploads are needed. The first teaching cycle supports worksheet links and text responses; uploads would need managed object storage and separate access checks.
- The embedded video classroom remains Phase 4, and payments remain Phase 5.

## 7. Live classroom — proposed approach

### Recommendation, pending founder agreement

Embed a managed video service inside the CodeLah lesson page. **Daily Prebuilt** is the initial recommendation for a standard teaching call because it provides an embeddable call interface with camera/microphone setup and screen sharing. **LiveKit** is an alternative if we decide that a deeply customised video layout is central to the product. This is an implementation judgment based on their documented capabilities, not a provider commitment.

No provider account, paid plan, or integration has been created. Final selection should follow a short trial using the expected class size, teacher device, student devices, and Singapore network conditions.

### Intended experience

1. The teacher schedules a lesson in CodeLah.
2. An enrolled student opens that lesson and selects **Join class**.
3. CodeLah's server checks their login, enrolment, role, and permitted joining time, then creates a short-lived credential restricted to that lesson's private room.
4. The browser shows a camera/microphone check and the embedded classroom. Teacher permissions enable class moderation; students receive only the permissions they need.
5. The teacher teaches through video and screen sharing. CodeLah keeps the lesson title, objective, and worksheet accessible around the call area.
6. After leaving, the student can still access the worksheet. The teacher confirms attendance and publishes the weekly update for the linked parent.

### Confirmed class size and planning baseline

- Four students per class; each session lasts 90–120 minutes.
- Assuming one teacher, plan for five simultaneous call participants.
- Full-session attendance uses 5 × 90–120 = **450–600 participant-minutes per lesson**. This is usage arithmetic, not a price quote; recording, extra participants, and provider billing rules can change cost.
- Trial the full five-person call for up to two hours, including screen sharing and reconnection. Set joining credentials and room timing to accommodate the scheduled lesson plus an agreed grace period.
- The classroom preview should prioritise the teacher's shared screen, with the four student positions and worksheets accessible.

### System responsibilities

- **CodeLah:** accounts, enrolments, schedules, access checks, materials, attendance records, feedback, and parent visibility.
- **Video provider:** real-time audio/video transport and the embedded call interface.
- **Browser:** camera/microphone permissions and screen-sharing selection; the video stream connects to the provider rather than passing through CodeLah's web server.

Create one private room per lesson session. Keep provider credentials on the server. Store a provider room reference against the lesson, so materials and feedback retain their own lesson identity. A room URL alone must not grant access.

Proposed initial controls: teacher moderation, a join window, teacher-led start, and screen-sharing permissions. A camera/microphone prejoin check is different from a teacher-admission lobby; explicitly implement and test whichever joining policy we select. Never assume that giving a student a valid token also makes them wait for the teacher.

Join/leave events may suggest attendance later, but the teacher should be able to review and correct the record. Event handling must tolerate reconnection and duplicate delivery before being used operationally.

Recording is proposed to be off initially. If recordings are requested, agree on access, consent, retention, and storage before enabling them. Parents see lesson reports by default in the proposed flow; whether they may attend live lessons is a separate decision.

### Trial and acceptance criteria for Phase 4

- Four distinct student test accounts and one teacher can join the same scheduled lesson from separate devices for a full two-hour trial.
- An unrelated student cannot obtain access; expired credentials and access to a different lesson are rejected.
- Camera, microphone, teacher screen sharing, leaving, and reconnecting work on target devices.
- Teacher/student permissions and the agreed joining policy work as intended.
- Materials remain accessible when the call ends or the connection drops.
- Verify quality from Singapore and estimate cost using expected class size, duration, and monthly lesson count.

### Decisions to settle before integration

- Number of simultaneous classes and monthly lesson count; class size and duration are confirmed above.
- Supported devices; laptops/desktops are the proposed primary teaching devices.
- Whether students may screen share, whether live chat is needed, and whether parents may join.
- Whether recording is needed at launch.
- Provider selection and budget after a small trial.

### Provider references

Reviewed 2026-09-15; recheck capabilities and pricing when implementing.

- [Daily overview and embedding options](https://docs.daily.co/)
- [Daily private rooms and room settings](https://docs.daily.co/reference/rest-api/rooms/create-room)
- [Daily meeting tokens, expiry, and permissions](https://docs.daily.co/reference/rest-api/meeting-tokens/create-meeting-token)
- [Daily Prebuilt customisation and prejoin behaviour](https://docs.daily.co/guides/products/prebuilt/customizing-daily-prebuilt)
- [LiveKit video conference component](https://docs.livekit.io/reference/components/react/component/videoconference/)
- [LiveKit screen sharing](https://docs.livekit.io/transport/media/screenshare/)

## 8. Working process and traceability

1. Record agreed scope and unresolved decisions in this document.
2. Implement scoped work on `dev` with fictional data during prototyping.
3. Record what changed, how it was verified, and known limitations.
4. Demonstrate the phase to the founder and record requested revisions.
5. Mark acceptance items complete only after checking them; agree on the next phase before starting it.

Keep confirmed decisions distinct from recommendations. Update this file as the source of project status; use additional focused documents only when the detail warrants them.

## 9. Progress log

### 2026-09-15 — repository and planning

- Connected the local folder to `https://github.com/CodeLah-EDU/codelah-platform.git` and selected local branch `dev`.
- Read the reference website's design documentation and colour/font tokens.
- Founder confirmed CodeLah as the brand and the dashboard prototype as Phase 1.
- Created this document with Phase 1 scope, acceptance criteria, phased roadmap, and a proposed live-classroom architecture.
- Verification: local Git status reports `dev`; documentation was checked against the reference design files and official provider documentation. No application exists yet, so no build or application tests have run.
- Next: implement the approved dashboard prototype; gather class-size and classroom requirements before the video integration phase.

### 2026-09-15 — class format confirmed

- Founder confirmed four students per class and 90–120-minute sessions.
- Updated the prototype cohort requirements, classroom trial criteria, and video usage baseline. One teacher per class remains a planning assumption.
- Phase 1 implementation started; no live video or paid provider account is required for the prototype.

### 2026-09-15 — dashboard prototype implementation

- Added the application in `web/`, keeping this document and the repository README at the project root. The folder contains the Sites Vinext/React/TypeScript starter, accessible UI primitives, and self-hosted CodeLah fonts.
- Implemented student, teacher, and parent tabs with one four-student fictional cohort, a 90-minute completed lesson, and a two-hour upcoming lesson.
- Added teacher attendance, per-student draft feedback, publish actions, and the linked parent/student view of Avery's published report. Other children's reports do not appear in the Avery parent demo.
- Added a readable sample worksheet and a classroom layout preview without accessing a camera or microphone.
- Preserved refresh-reset behaviour and visible demo labels. There is no real login, persistent data, live call, or payment capability.
- Verification: production build and TypeScript passed; four automated tests passed for publishing, child separation, invalid updates, refresh defaults, and lesson times. Application lint passed after markup fixes. Full-repository lint also checked the untouched starter catalog and found 19 existing errors in unused primitives/hooks; those are recorded rather than altering unrelated vendor components.
- Browser handoff was unavailable because no browser is connected. Desktop/mobile screenshots, keyboard interaction, and end-to-end click testing have not run; leave those acceptance items open.
- Added an optional feature-detected WebMCP role-preview tool. No supported WebMCP browser context is available, so its runtime contract has not been verified. It is not required for ordinary dashboard use.
- Environment: verified Node.js 22.21.0; starter requires 22.13+. The installer reported 11 dependency advisories; a dependency audit and any necessary upgrades remain a pre-pilot task.
- Status: private review deployment succeeded; founder review is still required before Phase 2.

### 2026-09-15 — review handoff

- Private preview: https://codelah-classroom-prototype.karthikadharsh2106.chatgpt.site
- Deployed application source: `00fea0980521f30145f6ccd05d308f715aa9007c` (Sites version 1). This subsequent documentation entry does not change the deployed application.
- Pushed the prototype to `CodeLah-EDU/codelah-platform`, branch `dev`; local `dev` tracks `origin/dev`.
- Confirmed deployment status `succeeded` and the completed local route returned HTTP 200. The local development server was stopped after publishing.
- Review walkthrough: select **Teacher**, edit Avery's attendance and feedback, choose **Publish demo update**, then select **Parent** to see Avery's report. Open the worksheet and classroom layout from **Student**. Refresh to reset the fictional data.
- Remaining before phase acceptance: browser/mobile and keyboard checks, optional WebMCP runtime validation, and founder feedback. Full starter-catalog lint and dependency advisories remain documented technical follow-ups; CodeLah application lint, TypeScript, build, and four automated state tests pass.

## 9. Phase 2 — accounts and access

Approved 2026-09-16. This phase replaces demo identity switching with authenticated access to persistent accounts and relationships. The Phase 1 demo remains available for review while the real account system is prepared.

### Scope

- Managed authentication with sign-in, sign-out, session handling, and account recovery.
- Persistent account profiles for students, parents, teachers, and a minimal administrator role for provisioning.
- Administrator-controlled parent–student links, teacher assignments, and class enrolments.
- Server-side access checks and database row-level security.
- Authenticated dashboard entry with only the authorised user's records.
- Explicit pending/unassigned, suspended, signed-out, and failed-connection states.

Scheduling workflows, persistent teacher lesson reports, worksheet submissions, video calls, and billing remain in their later phases. Do not imply that sample lesson data becomes real merely because accounts are connected.

### Intended access rules

| Role | Allowed information | Relationship changes |
| --- | --- | --- |
| Student | Own profile and enrolled classes | None |
| Parent | Own profile, explicitly linked children, and their classes | None |
| Teacher | Own profile and assigned classes/students | None |
| Administrator | Accounts and teaching relationships needed for setup | Create and revoke approved links/assignments |
| Pending or suspended account | Own account status only | None |
| Signed out | Sign-in/recovery pages only | None |

Roles must not come from a role selector or editable signup metadata. New identities receive no teaching access until provisioned. Each API and database query must enforce the same access boundaries, including direct requests for another student's ID. Credentials remain with the authentication service; the application stores no plaintext passwords.

### Connection and environment

- Selected Supabase project reference: `tcequgfvwzfbxawclyum`.
- MCP endpoint supplied by the founder: `https://mcp.supabase.com/mcp?project_ref=tcequgfvwzfbxawclyum&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching`.
- Local Codex MCP name: `codelah-supabase`. Registered and OAuth sign-in succeeded on 2026-09-16. The conversation does not expose it directly, but the supported Codex app-server MCP tool-call interface connects successfully using the existing OAuth login. No model/agent turn is started by that diagnostic client.
- Inspect schemas and project status before applying migrations. Initial inspection found no public tables, migrations, or Auth users. Account migrations have now been applied to this project.
- The current private Sites preview uses ChatGPT access. Confirm the supported external login/hosting path before exposing CodeLah accounts; students must not depend on ChatGPT accounts.
- Student sign-in is confirmed: username and password, managed by the linked parent or assigned teacher. Students do not need a personal email address for the CodeLah sign-in screen.

### Acceptance checklist

- [x] Supabase MCP authenticated and project contents inspected.
- [ ] External account login and hosting path confirmed.
- [x] Versioned account/relationship schema and migrations prepared and applied to the selected project after checking it was empty.
- [ ] Real sign-in, sign-out, session expiry/refresh, and recovery checked. Student sign-out/re-entry and password changes passed a live QA test; founder confirmed delivery of a recovery email. Recovery-link completion and session expiry remain to be checked.
- [ ] Parent can read a linked child and cannot read another child, including direct API/database access.
- [ ] Teacher can read assigned classes and cannot read an unassigned class.
- [ ] Student cannot read other students or modify relationships.
- [ ] Unassigned/suspended users and anonymous requests cannot access protected records.
- [ ] Client-supplied role changes cannot grant privileges.
- [ ] Revoking a link or assignment removes access.
- [ ] Authentication, migration, build, and relevant browser checks recorded.
- [x] Founder requested continued Phase 2 checks and the start of Phase 3 on 2026-09-20; Phase 2 acceptance gaps remain listed here.

### 2026-09-16 — Phase 2 connection setup

- Founder approved Phase 2 and provided the project-scoped Supabase MCP endpoint.
- Confirmed no Supabase tools were available in this session and no Supabase CLI account was authenticated.
- Registered `codelah-supabase` using the supplied endpoint. Automatic OAuth scope discovery failed; retried with supported database/project/environment scopes and obtained the interactive authorisation link.
- No Supabase project data has been read or modified, and no schema migration has been applied.
- The earlier local PostgreSQL test-engine installation was interrupted before a confirmed result; no Phase 2 dependency or source change was present on inspection.
- OAuth completed successfully for `codelah-supabase`; `codex mcp get` confirms the supplied project URL is enabled. The active conversation still returns `unknown MCP server` for this new connection and exposes no Supabase tools.
- Historical next step was to reload the connection. This was superseded by the working direct MCP client and implementation recorded below.

### Student account flow — confirmed direction

- A student signs in with a unique username and password.
- A linked parent or assigned teacher can initiate setup or a password reset for that student only. They cannot view the current password.
- Student account management does not grant permission to assign roles, claim another child, or change enrolments. Those relationships stay under administrator control.
- Supabase remains responsible for password verification and storage. Any mapping from username to the managed authentication identity stays server-side and must not expose adult email addresses.
- Invalid usernames and incorrect passwords receive the same sign-in response; apply rate limits before enabling the live flow.
- Account recovery and management endpoints must verify the adult's identity and active parent/teacher relationship on each request. Revoking the relationship must remove those powers.
- Implementation detail to verify against the selected Supabase project: how the username maps to its managed identity and how first-time password setup and recovery are delivered. No custom password store will be added.

### 2026-09-16 — student sign-in preference confirmed

- Founder selected student username/password login managed by a parent or teacher.
- Recorded decision D010 and the account management boundaries above.
- Supabase OAuth remains completed; its tools are still absent from this conversation's tool catalog. No new connection or installation is required, and no database changes were made in this update.

### 2026-09-16 to 2026-09-19 — Phase 2 implementation and verification

**Status:** implementation is available locally on `dev`; Phase 2 is not yet accepted or complete. Phase 3 has started locally with lesson scheduling and the first teaching workflow slice.

#### Connection and database

- Used the registered `codelah-supabase` connection through the documented local app-server protocol. OAuth succeeded; no repeated app restart was needed. The client only calls MCP tools; it does not start an AI agent turn.
- Initial inspection: public schema had no tables, migrations list was empty, and Auth contained zero users.
- Applied `accounts_and_access`, `student_accounts`, and `account_contact` migrations. Source files are in `supabase/migrations/`; Supabase assigns its own migration version timestamps.
- Accounts default to pending regardless of signup metadata. RLS enforces own/linked/assigned records, immediate relationship revocation, and suspended-account restrictions.
- Relationship foreign keys enforce the required parent, teacher, and student roles. A class row lock and trigger enforce at most four active students.
- Added a one-use private reservation for the founder-selected `hello@codelah.sg`. Only a verified matching Auth identity can claim it. Other accounts cannot query or change the reservation. Confirmed through `/auth/v1/settings` that email auto-confirm is disabled.
- Deployed `student-accounts` Edge Function version 1 with gateway JWT verification enabled. It separately validates the user through Supabase Auth and checks current account/relationship access before invoking the Auth admin API. Supabase supplies its service credential within the function; no service key was added to the frontend or local app environment.

#### Application changes

- `/login`: student username/password; adult email/password, registration, and password recovery.
- `/dashboard`: persistent role-aware accounts/classes, explicit pending/suspended/error states, student password management, and a minimal administrator interface for account roles, student creation, relationships, and class enrolments.
- `/auth/*`: sign-in, sign-out, email confirmation, password updates, and session refresh. Mutations validate the configured request origin; authenticated responses are marked private/no-store.
- Student usernames use lowercase 4–24 character handles starting with a letter. A server-side mapping uses an internal `students.codelah.invalid` Auth identity; students do not need a personal inbox. Supabase owns credential verification/storage.
- `/demo` retains the clearly labelled fictional Phase 1 teaching cycle. It does not show real lesson reports merely because accounts now exist.
- Preserved DM Sans, IBM Plex Mono, and the documented colour palette. Local configuration contains only the project URL, publishable key, and application origin.
- The local server uses **http://localhost:3001** because port 3000 belongs to the separate Minnum project. Founder confirmed adding `http://localhost:3001/auth/confirm` to Supabase Redirect URLs.
- The existing private Sites review URL still serves the Phase 1 deployment. Phase 2 has not been deployed there. External student/parent hosting remains to be agreed and configured.

#### Verification evidence

- 18 automated tests pass: actual PostgreSQL migration/RLS tests via PGlite, account-input/origin tests, and the original four demo-state tests.
- Database cases include cross-child reads, unrelated teachers, students changing roles/relationships, anonymous denial, pending/suspended accounts, revoked links, required relationship roles, four-student capacity, student-password authority, one-time verified administrator bootstrap, and shared login attempt limits.
- Four Chromium tests pass against the local app: signed-out dashboard redirects, visible/enabled login forms, generic invalid credentials, cross-origin mutation rejection, and mobile layout/keyboard skip navigation. The origin rejection in development is also enforced by Vinext; the application origin helper has separate unit coverage.
- Final production build, TypeScript, application lint (including account routes, proxy, and browser tests), and Git whitespace checks pass. The deployed student-account function rejects requests without a user JWT with HTTP 401.
- Supabase's first account-schema security-advisor check was clear. After adding the login throttle, it flags the intentional exposed `SECURITY DEFINER` function `consume_sign_in_attempt` for anonymous and authenticated execution. The function only increments private attempt counters and returns a boolean; callers cannot inspect the table or grant account access. See [anonymous execution finding](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [authenticated execution finding](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- The application throttle allows ten attempts per normalized identity per ten minutes, shared across instances. It supplements Supabase Auth limits; it does not intercept callers who use the Auth API directly. CAPTCHA/abuse controls and counter cleanup/load behaviour need review before a public pilot.

#### Remaining acceptance work

- [x] Founder confirmed registration/email verification for `hello@codelah.sg` reached the administrator dashboard. This is founder-reported verification; no password or session credential was shared.
- Verify a successful real sign-in/out, refresh/session renewal, email recovery, and first-time password setup.
- Administrator student creation and student login are confirmed by founder screenshots. Continue with class enrolment, parent/teacher links and sign-in, student password reset, and revoked-access checks. PostgreSQL policy tests are complete; remaining live multi-account checks are outstanding.
- Confirm SMTP/email delivery for intended adult users. Supabase default email delivery restrictions may require a configured email service before a pilot.
- Check desktop/mobile authenticated dashboards and the privileged Edge Function's successful and denied paths using test accounts.
- Agree on external hosting and configure its environment/origin/redirect URLs. The app must not require a student's ChatGPT account.
- Resolve the existing 11 dependency advisories and review the unused starter-catalog lint findings before pilot use.
- Founder reviews Phase 2 acceptance items while Phase 3 implementation continues locally.

#### Official implementation references

- [Supabase server-side authentication](https://supabase.com/docs/guides/auth/server-side)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Edge Function authentication](https://supabase.com/docs/guides/functions/auth)
- [Supabase password security](https://supabase.com/docs/guides/auth/password-security)

- Connection follow-up on 2026-09-19: the final MCP inventory check failed while refreshing its OAuth token (`Failed to parse server response`). Applied migration/function results above were already confirmed. This tool-connection failure does not affect the application’s Supabase publishable-key connection; refresh the MCP authorization before the next remote schema change. Remote migration-version reconciliation with local filenames is still pending; do not run a blind CLI migration push.

### 2026-09-19 — administrator activation confirmed

- Founder reports reaching the **Administrator dashboard** after registering `hello@codelah.sg` and confirming the email. This completes the initial administrator activation check.
- This confirms the founder's signup/confirmation path reaches the authenticated admin view. It does not yet verify sign-out/re-entry, password recovery, session renewal, or the multi-account teaching relationships.
- Next live check: create a clearly labelled test student with a unique username, then sign in as that student in a private browser window. Confirm that the student sees their own account and no administrator controls. Keep the administrator's original browser session open.
- After student creation/login works, verify a test class, enrolment, linked parent, assigned teacher, password reset, and access revocation. Phase 2 remains open while Phase 3 continues locally.

### 2026-09-19 — student creation and sign-in confirmed

- Founder screenshots show successful administrator creation of an active student, followed by username/password sign-in in a separate Incognito window.
- The student dashboard displays the student's own account, the student role, and no administrator controls. The empty class list is expected before enrolment.
- This verifies the successful student-creation and login path through the deployed account function and local app. It does not by itself verify cross-student database isolation, password resets, or parent/teacher access; those retain their separate acceptance checks.
- Next live check: create a test class in the administrator window, enrol this student, and refresh the student's window to confirm the class appears.

### 2026-09-19 — separate administrator workspace

- Founder requested a different administrator UI and separate pages after finding the combined student/class forms confusing. This is a Phase 2 usability revision, not a move into Phase 3.
- Added a dedicated administrator sign-in at `/admin/login`, linked clearly from the family/student sign-in page. It uses the same verified Supabase account; selecting the admin form never grants an admin role.
- Active administrators entering `/dashboard` now redirect to `/admin`. Other roles retain their existing dashboard. Every protected admin page checks the current active administrator account server-side, in addition to existing RLS and mutation authorization.
- Added a dark-green sidebar and compact operational layout using the documented DM Sans, IBM Plex Mono, off-white, and lime palette.

| Administrator page | Purpose |
| --- | --- |
| Overview | Real account/class counts and shortcuts to common setup tasks. |
| Students | Student directory, account name/status edits, and password resets. |
| Create student | A dedicated form for name, username, and initial password. |
| Parents & teachers | Adult accounts and role/status assignment. |
| Classes | Class list and occupancy, with a separate Create class page. |
| Class detail | That class's roster, enrolment changes, teacher assignments, and four-student capacity. |
| Parent links | Connect parents to students, revoke access, or restore a link. |

- Form submissions return to the relevant management page. Return locations use a strict allowlist and canonical class-ID path validation, not arbitrary redirect URLs.
- Existing data and the database schema are unchanged. Student creation and password actions still use the deployed authenticated Edge Function.
- Verification: build, TypeScript, and application/admin-component lint pass; 19 automated tests pass, including redirect-target validation and existing PostgreSQL permission tests. The new admin sign-in returns HTTP 200; signed-out requests to the workspace, student-creation page, and class-creation page redirect to `/admin/login`.
- Authenticated visual/interaction review of the revised pages is still pending with the founder. No browser screenshot or click testing was run for this revision. The existing server remains available at `http://localhost:3001`; the hosted Phase 1 review site is not updated by this local change.
- Updated enrolment walkthrough: administrator → **Classes** → **Create class**, then **Manage class** → choose the student → **Enrol student**. Refresh the student's separate window to check the assigned class appears.


### 2026-09-20 — student parent details and separate adult directories

- Added **Parent information** to every student record: linked parent names, verified contact email when available, account status, and a shortcut to manage the relationship. Following a parent's name opens their directory entry. Students without a parent show an explicit empty state.
- Split adult administration into **Parents**, **Teachers**, and **Account requests**. Parents show linked students; teachers show assigned classes. New adult registrations remain in Account requests until an administrator assigns a role. These pages retain the server-side administrator check and existing database permissions.
- Opening **Link a parent** from a student preselects that student. No database migration is needed for this UI revision.
- Used the founder-authorized isolated administrator browser session. The live Chromium test passed: separate creation forms, class creation, student enrolment, teacher assignment, parent linking/contact display, directory navigation, student username/password sign-in, student denial of administrator pages, removal of enrolment, and parent-link revocation.
- Authenticated parent/teacher database queries confirmed that each could read their linked/assigned student and lost access after revocation. Test parent/teacher identities were provisioned as fixtures; this does **not** verify adult email registration, email delivery, or password recovery.
- Verified desktop student layout and fully rendered Parents/Teachers pages at 390px with no page-wide horizontal overflow. Fixed the browser test to wait for streamed page content before taking mobile screenshots.
- Validation: live administrator browser flow passes; TypeScript, application lint, production build, and Git whitespace checks pass. The workspace's 20 automated tests pass (19 existing account/demo tests plus the separately edited lesson-visibility test). Concurrent Phase 3 files are preserved and excluded from this administrator change.
- Test cleanup verified against Supabase: both temporary QA classes removed; all six QA accounts from the two runs suspended. Their Auth identities remain because this app does not expose Auth-account deletion. No existing founder/student passwords were changed. Session files stay outside the repository.
- Phase 2 acceptance remains open for adult email/recovery and successful/denied student-password-reset flows. This check does not approve later-phase work or external deployment.


### 2026-09-20 to 2026-09-21 — Phase 2 follow-up and Phase 3 implementation

- Founder authorized one password-reset email to `hello@codelah.sg` and confirmed it arrived. The recovery link itself was not opened in the live check; the administrator password was not changed.
- A live QA run confirmed linked-parent student password reset, rejected an old student password, accepted the new password, denied unrelated parent/teacher resets, allowed an assigned teacher reset, allowed student self-service password change, and confirmed sign-out and re-entry. The isolated administrator browser session later expired; a fresh administrator sign-in is needed to finish the combined lesson browser test. A read-only Supabase check confirmed all 10 labelled QA accounts from these runs are suspended and no QA classes remain.
- Applied the teaching-workflow migration to the selected Supabase project after confirming its public schema contained only the six Phase 2 tables. Local PostgreSQL tests now include per-student attendance, submission, and report access, draft/published report isolation, role revocation, and constraints. The current source passes 29 automated tests, application lint, TypeScript, production build, and four signed-out Chromium checks.
- The protected lesson workspace supports scheduling, worksheets by instructions/link, submissions, teacher review, attendance, and family reports. A separate opt-in browser test creates QA users and classes, exercises the full cycle, and suspends its fixtures after cleanup. It is pending a renewed administrator test session before its end-to-end results can be recorded.
- The existing Sites preview still hosts only the Phase 1 fictional prototype. Real account access for external students/parents requires a hosting path that does not require ChatGPT sign-in, plus the matching Supabase redirect and application origin settings. No public launch is implied by these local/DB changes.


### 2026-09-24 — weekly dashboard summary

- Added a role-aware teaching-week section to the authenticated dashboard. Students and linked parents see up to three upcoming lessons with Singapore dates/times and their latest three published teacher reports, including topics covered and suggested practice.
- The full lesson schedule now separates upcoming lessons from previous and cancelled records, keeping recent history available without mixing it into the next-class list.
- Empty, loading failure, long text, and small-screen layouts use the existing CodeLah design system. Database row-level security remains the source of truth for which lessons and reports each account can retrieve.
- Verification: application lint, TypeScript, production build, Git whitespace checks, and all 29 account/lesson tests pass. The authenticated multi-role browser run still requires a renewed administrator test session.
