# tulia.study

A desktop Bible study app built for focus, depth, and collaboration.

<img width="1680" height="960" alt="Screenshot 2026-05-04 at 17 10 29" src="https://github.com/user-attachments/assets/7c0a9ca9-33ea-47bc-9cb8-3067a0514508" />
<img width="3360" height="1918" alt="image" src="https://github.com/user-attachments/assets/90be971d-51f7-449a-bb77-8ede0ae4b918" />
<img width="1680" height="954" alt="Screenshot 2026-05-04 at 17 08 30" src="https://github.com/user-attachments/assets/c7799d54-dc25-486a-8db0-02d4e04a9565" />

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
| Backend | Laravel API (separate repo) |
| Collab | Hocuspocus (Yjs) for shared study sessions |
| Broadcasting | Laravel Reverb |
| Build | Vite + pnpm |

---

## Design

Dark by default. Gold accent. Minimal chrome. The reading surface is the product — everything else gets out of the way.

Heavily inspired by the design philosophy of [Linear](https://linear.app): fast, keyboard-first, no unnecessary UI.

---

## Installation

### macOS — first-time open

The macOS builds aren't signed with an Apple Developer certificate yet (it's $99/year and the app is still early). Gatekeeper will say *"Apple could not verify Tulia Study is free of malware..."*. The code is open source — you can read every line in this repo. To open it the first time:

- **macOS 14 and earlier**: in Finder, right-click `Tulia Study.app` → **Open**. The same warning appears, but now with an **Open** button. Only needed once.
- **macOS 15 (Sequoia) and later**: open **System Settings → Privacy & Security**, scroll down, you'll see *"Tulia Study was blocked..."* → click **Open Anyway**.

After that first launch, double-clicking works normally.

---

## Development

```bash
# Install dependencies
pnpm install

# Web only (port 1420)
pnpm dev

# Desktop with hot reload
pnpm tauri:dev

# Build desktop binary
pnpm tauri:build
```

> On Windows, run Tauri commands in PowerShell — the Rust/cargo PATH isn't picked up in Git Bash.

The backend lives in a separate repo and is served locally at `https://verbum.test` via [Herd](https://herd.laravel.com/) (macOS). Set `VITE_API_URL=https://verbum.test` in `.env.local` to point at it.

---

## Acknowledgements

tulia.study is built on the shoulders of people who did the hard work of digitizing and publishing scripture openly.

**Bible texts**

- [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) — KJV, ASV, BSB, Darby, Geneva 1599, Wycliffe, and many more in CSV format. Public domain.
- [seven1m/open-bibles](https://github.com/seven1m/open-bibles) — Spanish translations including Reina-Valera 1909, Biblia en Español Sencillo, Palabra de Dios para Ti, and Versión Biblia Libre. Public domain.
- [TriGataro/Biblia_Reina_Valera_1960](https://github.com/TriGataro/Biblia_Reina_Valera_1960) — Reina-Valera 1960.

**Commentary**

- [Enduring Word](https://enduringword.com/bible-commentary/) by David Guzik — verse-by-verse commentary covering all 66 books. Used with attribution.

**Cross-references**

- [OpenBible.info](https://www.openbible.info) — crowd-verified cross-reference dataset, CC-BY.

---

## License

MIT
