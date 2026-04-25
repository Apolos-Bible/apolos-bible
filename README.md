# tulia.study

A desktop Bible study app built for focus, depth, and collaboration.

---

## Why

I wanted to study the Bible more seriously — not just read it, but actually dig in, take notes, highlight passages, and do it together with friends online. Every tool I found was either too bloated, too simple, or not designed for the way I actually study. So I built one.

tulia.study is the app I wished existed.

---

## What it does

**Read** — Browse 30+ Bible translations across all books and chapters. Switch versions on the fly or compare them side by side.

**Study** — Highlight verses in color, write notes per verse, view cross-references, and read chapter commentary. Everything stays in context.

**Navigate fast** — Command palette (⌘K) to jump anywhere. Keyboard shortcuts to move between verses and chapters without touching the mouse.

**Study with friends** — Add friends, see who's reading the same chapter as you in real time, and get notified when they highlight or annotate something.

**Your library** — Bookmark verses to revisit later. All your notes and highlights sync to your account.

---

## Stack

| Layer | Tech |
|---|---|
| UI | React + TypeScript + Tailwind |
| State | Zustand |
| Desktop | Tauri 2 (Rust + WebView2) |
| Backend | Laravel 13 API |
| Realtime | Laravel Reverb (WebSockets) |
| Build | Vite + pnpm |

---

## Design

Dark by default. Gold accent. Minimal chrome. The reading surface is the product — everything else gets out of the way.

Heavily inspired by the design philosophy of [Linear](https://linear.app): fast, keyboard-first, no unnecessary UI.

---

## Development

```bash
# Install dependencies
pnpm install

# Web only (port 1420)
pnpm dev

# Desktop with hot reload — run in PowerShell
pnpm tauri:dev

# Build desktop binary
pnpm tauri:build
```

> On Windows, always run Tauri commands in PowerShell — the Rust/cargo PATH is not available in Git Bash.

The backend (`verbum`) runs separately on port 8000. Set `VITE_API_URL` in `.env.local` to point to your local instance.

---

## License

MIT
