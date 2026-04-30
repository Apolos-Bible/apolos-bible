# Changelog

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
