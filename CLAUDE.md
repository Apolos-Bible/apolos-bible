# Tulia

Spanish-first social Bible reading app. Read the Bible *with others* — friends, comments, shared feed, reading presence.

**Design**: keyboard-first, minimalist, Linear-style. Every action should be reachable by keyboard; favor command palettes, shortcuts, and dense-but-quiet UI over mouse-driven affordances. Visual language follows Linear: restrained typography, subtle borders, generous whitespace, no decorative chrome.

Name comes from *Tertulia* (Spanish: a social gathering to discuss books/ideas). Domain: `tulia.study`.

## Layout

This folder contains both halves of the product. Claude is invoked from here so it can see and edit across both.

- `backend/` — Laravel + Livewire + Alpine + Tailwind. Local: `https://verbum.test` via Herd (symlink in `~/Library/Application Support/Herd/config/valet/Sites/verbum`). Prod: `https://tulia.study`. SQLite at `backend/database/database.sqlite` (absolute path in `.env`).
- `frontend/` — Tauri 2 desktop/mobile + Vite + React 18 + TypeScript + Tailwind. Package name `tulia-study`. Web build deploys to Firebase Hosting at `https://bible.tulia.study` (`pnpm deploy`). Talks to the backend over HTTP and to a Hocuspocus collab server (JWT-authed) for shared study sessions.

## Common commands

Backend (`backend/`):
- Browse: `https://verbum.test`
- Artisan: use Herd's PHP — Herd sets it on PATH in its shells.

Frontend (`frontend/`):
- `pnpm dev` — Vite dev server
- `pnpm tauri:dev` — Tauri desktop dev
- `pnpm build:web` / `pnpm deploy` — web build + Firebase deploy
- `pnpm test` — Vitest

## Notes for Claude

- Treat `backend/` and `frontend/` as one product. Cross-cutting changes (auth, session protocol, API shape) usually need edits in both.
- When editing the backend's `.env`, keep `DB_DATABASE` as an absolute path — Laravel's SQLite driver requires it.
- The Herd symlink target is the absolute path to `backend/`. If this folder ever moves again, update the symlink and `DB_DATABASE`.
- Rust build artifacts under `frontend/src-tauri/target/` contain hardcoded absolute paths; they regenerate on rebuild — don't hand-edit.
