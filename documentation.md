# CodeLah platform — project documentation

Last updated: 2026-09-15

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
| 1 — Dashboard prototype | Review the student, teacher, and parent experience with fictional sample lessons. | Implemented; browser verification and founder review pending |
| 2 — Accounts and access | Real authentication, parent–child links, teacher assignments, and enforced permissions. | Proposed |
| 3 — Teaching workflow | Persistent schedules, worksheets, submissions, attendance, and teacher feedback. | Proposed |
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
- [ ] Founder reviews the prototype and agrees on the next phase.

## 6. Live classroom — proposed approach

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

## 7. Working process and traceability

1. Record agreed scope and unresolved decisions in this document.
2. Implement scoped work on `dev` with fictional data during prototyping.
3. Record what changed, how it was verified, and known limitations.
4. Demonstrate the phase to the founder and record requested revisions.
5. Mark acceptance items complete only after checking them; agree on the next phase before starting it.

Keep confirmed decisions distinct from recommendations. Update this file as the source of project status; use additional focused documents only when the detail warrants them.

## 8. Progress log

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
- Status: preparing a private review deployment; founder review is still required before Phase 2.
