# AGENTS.md

> **tulia.study** — collaborative Bible study desktop app. React 18 + Vite 8 + TypeScript 5 + Tailwind 3 + Zustand 5, packaged as a Tauri 2 desktop binary. Backend is a separate Laravel API (`verbum`).

> **Note:** `CLAUDE.md` exists for Claude Code users but contains stale claims (e.g. "highlights are client-side", "AuthModal not connected"). This file is the authoritative source.

## Commands

```bash
pnpm dev                # Vite web dev server on port 1420
pnpm tauri:dev           # Desktop dev with hot reload — use PowerShell on Windows (cargo PATH broken in Git Bash)
pnpm build               # vite build → out/ (used by Tauri beforeBuildCommand)
pnpm build:web           # generate-sitemap.mjs + vite build → out/ (SEO-ready web build)
pnpm generate-sitemap    # Fetch books from API → public/sitemap.xml (1256 URLs)
pnpm generate-static     # Fetch all chapters from API → out/bible/*/index.html (1255 static HTML files)
pnpm tauri:build         # Full desktop binary
pnpm test                # vitest run (happy-dom) — 4 test files in src/lib/
pnpm test:watch           # vitest watch mode
pnpm deploy               # pnpm build:web && generate-static-chapters.mjs && firebase deploy --only hosting
```

No lint or typecheck scripts exist.

## Architecture

### 16 Zustand stores (src/lib/store/)

| Store | Responsibility |
|---|---|
| `useAuthStore` | Login/register/logout via `/api/auth/*`. Token in localStorage as `verbum_token`. |
| `useVerseStore` | Bible versions, books, chapters — API-backed via `src/lib/bibleApi.ts` |
| `useNoteStore` | CRUD notes per verse via `/api/verses/{id}/notes` |
| `useHighlightStore` | Highlights via `/api/verses/{id}/highlights` and `/api/highlights/batch` — **server-backed** |
| `useBookmarkStore` | Bookmarks via `/api/verses/{id}/bookmark` |
| `useUIStore` | Modals, panels, theme, font size, toasts, reading mode |
| `useStudyStore` | Collaborative study sessions (create, join, invite, end) |
| `useChatStore` | Real-time chat via Laravel Echo + Reverb |
| `useFriendStore` | Friends, friend requests, user search |
| `useNotificationStore` | Notifications with polling + Reverb push |
| `usePresenceStore` | Realtime "who's reading this chapter" (friends only) |
| `useActivityStore` | Recent friend activity on verses (30s TTL) |
| `useCrossRefStore` | Cross-references per verse/chapter |
| `useCompareStore` | Compare Bible versions side by side |
| `useBiblePreviewStore` | Bible passage preview (used in study canvas InsertVerseModal) |
| `useContextMenuStore` | Right-click context menu state |

### API conventions (`src/lib/api.ts`)

- Reads `verbum_token` from localStorage, auto-attaches `Authorization: Bearer`.
- `api.patch()` and `api.delete()` send as POST with `_method: 'PATCH'` / `_method: 'DELETE'` in the JSON body (Laravel convention).
- Base URL from `VITE_API_URL` env var (default `https://verbum.test`).

### Key facts

- **Router:** `react-router-dom` v7 with `BrowserRouter`. URL ↔ store two-way sync via `useVerseStore.loadBooks(initialRoute?)`. Routes: `/` (home), `/bible/:book`, `/bible/:book/:chapter`, `/bible/:book/:chapter/:verse`.
- **Path alias:** `@/*` → `./src/*`.
- **Build output:** `out/` (not `dist/`). When built with `build:web`, also includes `out/bible/` static chapter pages. When built with `build` (Tauri), only the SPA shell.
- **Verse IDs:** slug format `book-chapter-verse` in UI; numeric `apiId` for backend calls.
- **Verse display formats:** `flow` (continuous paragraph with superscript numbers) and `verse` (each verse in its own block).

### UI Layout

```
Sidebar (240px) | Left Panel (420px, toggleable) | Main | Right Panel (420px, toggleable)
Books/Chapters  | Favorites / My Notes / Friends   | Verses| Study / Commentary
                 / Chat / My Studies
```

### Design system

- **Colors:** Dark theme with gold accent `#c8a96a`. All colors are CSS custom properties in `tailwind.config.ts`, referenced as `var(--color-*)`.
- **Font:** Inter (body, `font-sans`), Lora (reading, `font-reading`). Sizes: `2xs`(10px) to `lg`(15px).
- **Theme toggle:** sets `data-theme` attribute on `<html>`.
- **Design patterns manifesto:** `docs/design-patterns.md` — consult before creating/modifying UI components.

### SEO

- **Head management:** `react-helmet-async` + `HelmetProvider` in `src/main.tsx`. Per-route dynamic meta via `<SEOMeta />` in `VerseList`.
- **Hook:** `src/lib/hooks/useSEOMeta.ts` generates title, description, canonical URL, OG tags, Twitter Card, and JSON-LD `BreadcrumbList` + `WebPage` from current book/chapter/verse.
- **Static fallback:** `scripts/generate-static-chapters.mjs` generates 1255 static HTML files (`out/bible/<slug>/<chapter>/index.html`) with full verse content, meta tags, and JSON-LD. Served directly by Firebase before the SPA rewrite kicks in. Run via `pnpm generate-static` or as part of `pnpm deploy`.
- **Static head:** `index.html` has base OG/Twitter/JSON-LD as fallback (`Organization` + `WebApplication` schema).
- **robots.txt:** `public/robots.txt` allows crawling, points to sitemap.
- **Sitemap:** `scripts/generate-sitemap.mjs` fetches books from API → `public/sitemap.xml` (1256 URLs: homepage + 66 books + 1189 chapters). Runs before every build.
- **Canonical URLs:** set via `<link rel="canonical">` in `<SEOMeta>`, updated per page.
- **URL structure:** `/bible/:book/:chapter` and `/bible/:book/:chapter/:verse`. Store ↔ URL sync in `App.tsx`.

### Realtime systems (4 coexist)

| System | Protocol | Purpose |
|---|---|---|
| Hocuspocus | WebSocket (`ws://localhost:1234` / `wss://tulia.study/hocuspocus/`) | Yjs CRDT sync for collaborative study canvas (React Flow) |
| Laravel Echo + Reverb | WebSocket (`localhost:8080` / `tulia.study:443`) | Chat messages, typing, read receipts |
| Presence channels | Reverb | Who's reading the same chapter (friends only) |
| Firebase Cloud Messaging | HTTP | Push notifications |

## Dead code

- `src/lib/supabase/client.ts` — not imported anywhere. Supabase npm packages are in `dependencies` but unused.

## Release

- GitHub Actions on `v*` tags builds Tauri binaries (macOS universal, Linux, Windows).
- Tag must match `package.json` version exactly (validated in CI step).
- Uses `tauri-apps/tauri-action@v0`, pnpm 10.20, Node 22, Rust stable.
- Updater configured in `tauri.conf.json` with GitHub releases endpoint.
