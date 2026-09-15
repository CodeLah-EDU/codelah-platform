# CodeLah platform

Phase 1 is an in-memory dashboard prototype for four-student coding classes in Singapore. Use the demo role switcher to review student, teacher, and parent views. Open the worksheet or classroom layout, and publish a fictional teacher update for Avery to see it in the parent view.

See [documentation.md](documentation.md) for agreed scope, decisions, the phase roadmap, and verification status. Development uses the `dev` branch.

## Run locally

Use Node.js 22.13 or newer (verified with 22.21.0) and npm.

```sh
cd web
npm ci
npm run dev
```

Open the Local URL printed by the server. It will choose another port if 3000 is already used.

## Verify

From `web/`:

```sh
npm run typecheck
npm run lint:app
npm test
npm run build
```

## Structure

- `documentation.md`: project decisions and progress.
- `web/app/`: dashboard, shared styles, metadata.
- `web/lib/demo.ts`: fictional cohort, Singapore lesson times, and draft/publish state transitions.
- `web/components/ui/`: starter-provided accessible interface primitives.
- `web/tests/`: checks for draft isolation, per-child updates, validation, and class format.
- `web/.openai/hosting.json`: private Sites preview configuration.

The `web/` subfolder contains the application so project documentation stays at the repository root. It uses React, TypeScript, and the Sites Vinext starter. There is no database, real authentication, live call, payment integration, or persistent student data. Refresh resets all demo edits. The parent demo is linked only to the fictional student Avery. Role switching is for prototype review, not access control.

`npm run lint` additionally checks the entire starter component catalog; it currently reports 19 existing errors in unused starter components/hooks. `lint:app` checks CodeLah application code. Browser/mobile interaction verification remains pending because no browser is connected to this session.
