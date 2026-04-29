# Bible Verse Links in Chat — Design Spec

**Date:** 2026-04-29  
**Status:** Approved

## Overview

Two related features:

1. **Preferred version persistence** — the Bible version the user selects in settings is remembered across sessions via localStorage.
2. **Verse reference detection** — chat messages are scanned for Bible references (e.g. `Juan 3:16`, `John3:16`, `Matthew 14`, `NIV Rom 8:1-4`). Detected references render as clickable links that navigate the main reader to that passage without closing the chat panel.

---

## Feature 1: Preferred Version Persistence

### Current state
`useVerseStore` initialises `versionId` to the hardcoded value `1`.

### Change
- **On init:** read `localStorage.getItem('tulia_version_id')`, parse as `Number`, fallback to `1`.
- **On `setVersion`:** after updating store state, write `localStorage.setItem('tulia_version_id', String(id))`.

No new UI. The existing settings modal already calls `setVersion`, so persistence is automatic.

---

## Feature 2: Verse Reference Detection

### Parser — `src/lib/bibleRefs.ts`

#### `BOOK_ALIASES: Record<string, string>`
A flat map from lowercase alias → book slug, covering all 66 books in:
- English (full name + common abbreviations: `mt`, `mat`, `matthew`)
- Spanish (full name + common abbreviations: `mt`, `mat`, `mateo`)

Multi-word aliases use a space separator (e.g. `'1 corinthians'`, `'1 corintios'`). Accented characters are included as-is (`génesis`, `éxodo`).

#### `segmentText(text: string): Segment[]`
Splits a message body into alternating plain-text and reference segments.

```ts
type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'ref'; raw: string; slug: string; chapter: number; verse: number | null; endVerse: number | null; versionAbbr: string | null }
```

**Regex pattern** (case-insensitive):
```
[VERSION?] [BOOK] [CHAPTER][:VERSE[-ENDVERSE]?]?
```
- `VERSION`: optional 2–5 uppercase letter prefix (e.g. `NIV`, `RVR`, `NVI`) followed by a space
- `BOOK`: matched against the alias map after lowercasing and accent normalisation
- `CHAPTER`: integer
- `VERSE`: optional integer
- `ENDVERSE`: optional integer (range end)

Unrecognised book aliases produce no segment — no false positives, no errors.

The parser is **pure**: no side effects, no API calls, no store access.

---

### Components

#### `src/components/chat/VerseLink.tsx`
Receives a `ref`-kind segment. Renders an inline styled span:
- Style: `text-accent underline cursor-pointer` — gold accent, underlined, fits inside chat bubbles
- **On click:**
  1. If `versionAbbr` is present, check `useVerseStore.getState().versions` for a matching `abbreviation` (case-insensitive). If found, call `setVersion(matchedVersion.id)` first.
  2. Call `useVerseStore.getState().openVerse(slug, chapter, verse ?? 1)`.
  3. Chat panel stays open — no panel state changes.

#### `src/components/chat/MessageBody.tsx`
Thin wrapper used by `MessageItem`. Calls `segmentText(text)`, maps:
- `{ kind: 'text' }` → `<span>`
- `{ kind: 'ref' }` → `<VerseLink>`

Preserves existing `whitespace-pre-wrap break-words` behaviour.

---

### Change to `MessageItem`
Single line change: replace `{message.body}` with `<MessageBody text={message.body} />`.

---

## Out of Scope

- Detection in notes, highlights, or other non-chat contexts
- Verse preview popover on hover
- Fuzzy / typo-tolerant book name matching
- Any language beyond English and Spanish
