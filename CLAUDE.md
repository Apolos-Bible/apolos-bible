# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**tulia.study** — a collaborative Bible study desktop app. Stack: React + Vite + TypeScript + Tailwind + Zustand, packaged as a Tauri 2 desktop binary. The backend is a separate Laravel 13 API (`verbum`, at `C:\Repos\verbum`) running on port 8000.

## Commands

```bash
# Web dev only (Vite, port 1420)
pnpm dev

# Desktop dev (Vite + Tauri window with hot reload)
pnpm tauri:dev        # Run in PowerShell — cargo PATH is broken in Git Bash on Windows

# Build
pnpm build            # Vite → /out
pnpm tauri:build      # Full desktop binary

# Preview built web output
pnpm preview
```

> **Windows note:** Always run `pnpm tauri:dev` and `pnpm tauri:build` in PowerShell, not Git Bash — the Rust/cargo PATH is not available in Git Bash on this machine.

## Architecture

### State & Data Flow

Six Zustand stores, each owning a domain:

| Store | Responsibility |
|---|---|
| `useAuthStore` | Login/register via `/api/auth/*`, token in `localStorage` as `verbum_token` |
| `useVerseStore` | Bible versions, books, chapters — all API-backed via `bibleApi.ts` |
| `useNoteStore` | CRUD notes per verse via `/api/verses/{id}/notes` |
| `useHighlightStore` | Highlights — **still client-side only**, no backend table yet |
| `useBookmarkStore` | Bookmarks via `/api/verses/{id}/bookmark` |
| `useUIStore` | Modals, panels, theme, font size, toasts |

API calls go through `src/lib/api.ts` (sets `Authorization: Bearer {token}` on every request). Bible-specific endpoints are in `src/lib/bibleApi.ts`.

### UI Layout

Four-column layout managed by `PanelLayout`:

```
Sidebar (240px) │ Left Panel (420px, toggleable) │ Main │ Right Panel (420px, toggleable)
Books/Chapters  │ Favorites or My Notes          │ Verses│ Study (highlights, notes)
```

### Design System

- **Colors:** Dark theme with gold accent `#c8a96a`. All colors are CSS custom properties defined in `tailwind.config.ts` and referenced as `var(--color-*)`.
- **Font:** Inter, sizes from `2xs` (10px) to `lg` (15px) via Tailwind config.
- **Theme toggle:** sets `data-theme` attribute on `<html>`.
- **Design patterns manifesto:** `docs/design-patterns.md` — patrones de Linear (layout, espaciado, interacción, animaciones). Consultar antes de crear o modificar componentes UI.

### Routing / Navigation

No router library — navigation is state-driven. Verse IDs use the slug format `book-chapter-verse` internally; the stores also track numeric API IDs separately for backend calls.

### Backend (verbum)

`VITE_API_URL` in `.env.local` points to the verbum Laravel API (default `https://verbum.test`). CORS is configured in verbum to allow `localhost:1420` and `tauri://localhost`.

Key API shape:
- Auth: `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`
- Bible: `GET /api/versions`, `GET /api/versions/{id}/books`, `GET /api/versions/{id}/books/{slug}/chapters/{n}`
- Notes: `GET|POST /api/verses/{id}/notes`, `PATCH|DELETE /api/notes/{id}`
- Bookmarks: `POST /api/verses/{id}/bookmark`
- Search: `GET /api/versions/{id}/search?q=`

### Current Incomplete Areas

- `AuthModal` component exists but is not yet connected to `useAuthStore`
- Highlights have no backend table — `useHighlightStore` is local-only
- `src/lib/supabase/client.ts` existe pero es código muerto — Supabase no está en el stack
