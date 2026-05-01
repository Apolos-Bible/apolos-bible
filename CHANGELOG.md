# Changelog

## [0.1.4] - 2026-05-01

### Features

- **Note visibility (public/private):** Each note can be public or private (default). Toggle visibility with a badge pill; double-click confirmation prevents accidents. A per-verse "Show notes from others" switch controls whether other users' public notes appear. Smooth entry animations with staggered fade-in for note lists.
- **Complete i18n:** All remaining UI strings are now internationalized (EN/ES). No more hardcoded text anywhere in the interface.
- **Multi-verse selection:** Select multiple verses at once to add group notes or apply highlights. Group notes are saved to each selected verse.
- **Note previews beside verses:** Small preview icons appear next to verses that have your notes, giving at-a-glance awareness.
- **Auto locale detection:** Initial app locale is inferred from the browser's `navigator.language`, falling back to EN.
- **Automatic app updates:** Tauri updater plugin checks for new releases and prompts the user to install them.

### UI/UX Improvements

- **Book accordion:** Smooth expand/collapse animations. Syncs selected book when loading chapters. Chapter selection integrated into the accordion.
- **Refined reading navigation:** Cleaner verse interaction, improved toolbar behavior.
- **Design patterns reference:** Added `docs/design-patterns.md` with Linear-inspired layout & interaction patterns.

### Fixes

- Preserve note owner info after editing
- Guard note preview owner lookup (null safety)
- Require login before protected verse actions (highlights, notes)
- Fix Android viewport height (`dvh` / `svh` support)
- Add Android icon entries and ignore `gen/` directory
- Fix note editing to preserve likes_count and is_liked state

---

## [0.1.3] - 2026-04-30

### Features

- **Slash commands:** `/v` verse search command in chat input with autocomplete
- **Verse autocomplete:** `/v` triggers a verse picker with accent-insensitive search
- **Clickable verse references:** Bible references in chat messages render as links that navigate to that verse
- **Internationalization (i18n):** Full i18n scaffold with i18next; locale files for EN/ES
  - Language selector added to Settings
  - All UI strings translated: AuthModal, reading panels, sidebar, Friends, Notes, Study panel, HighlightToolbar, CommandPalette, KeyboardShortcutsPanel, ChatPanel
- **Chat panel:** Direct messages, group chats, typing indicators, and read receipts
- **Presence tooltips:** Show online status in group conversations
- **Manage group dialog:** UI to manage group chat members
- **Real-time conversation updates:** Live message and presence sync
- **Preferred Bible version persistence:** Selected version is saved to `localStorage`

### Fixes

- Clear notification badge when Friends panel is opened
- Stop infinite `loadMessages` loop in ChatThread

### Infrastructure

- Added Vitest with `happy-dom` environment for unit testing
- Mobile: hidden keyboard-only affordances, close button for study panel, improved reading/navigation, fixed shell height, prevented page scroll overflow
- Default theme changed to light

---

## [0.1.2] - initial release
