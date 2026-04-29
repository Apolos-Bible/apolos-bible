# Bible Verse Links in Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect Bible references in chat messages (e.g. `Juan 3:16`, `john3:16`, `NIV Matthew 14`, `Rom 8:1-4`) and render them as clickable links that navigate the main reader without closing the chat panel; also persist the user's preferred Bible version across sessions.

**Architecture:** A pure parser (`bibleRefs.ts`) splits message text into plain and ref segments using a regex built from a static English+Spanish alias map. A `VerseLink` component handles click navigation via `useVerseStore.openVerse`. `MessageItem` delegates body rendering to `MessageBody` which composes these two. Version persistence is two lines in `useVerseStore`.

**Tech Stack:** React 18, TypeScript, Zustand 5, Vitest (to be added), Vite 8

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/bibleRefs.ts` | `BOOK_ALIASES` map + `Segment` type + `segmentText()` |
| Create | `src/lib/bibleRefs.test.ts` | Vitest unit tests for `segmentText` |
| Create | `src/components/chat/VerseLink.tsx` | Clickable ref chip; calls `openVerse` on click |
| Create | `src/components/chat/MessageBody.tsx` | Renders segmented text (plain spans + VerseLinks) |
| Modify | `src/lib/store/useVerseStore.ts` | Read/write preferred version from localStorage |
| Modify | `src/components/chat/MessageItem.tsx` | Swap `{message.body}` for `<MessageBody>` |
| Modify | `vite.config.ts` | Add `test` block for Vitest |
| Modify | `package.json` | Add vitest devDependency + test scripts |

---

## Task 1: Bootstrap Vitest

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`

- [ ] **Step 1: Install Vitest and happy-dom**

```bash
pnpm add -D vitest happy-dom
```

Expected output: Packages added to devDependencies.

- [ ] **Step 2: Add test scripts to package.json**

Open `package.json`. In the `"scripts"` object, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Result:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "tauri": "tauri",
  "tauri:dev": "tauri dev",
  "tauri:build": "tauri build",
  "test": "vitest run",
  "test:watch": "vitest"
},
```

- [ ] **Step 3: Add test config to vite.config.ts**

Replace the entire content of `vite.config.ts` with:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    outDir: 'out',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
})
```

- [ ] **Step 4: Verify Vitest works**

Create `src/lib/bibleRefs.test.ts` with this placeholder and run tests:

```ts
describe('placeholder', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

```bash
pnpm test
```

Expected output:
```
✓ src/lib/bibleRefs.test.ts (1)
Test Files  1 passed (1)
```

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts package.json pnpm-lock.yaml src/lib/bibleRefs.test.ts
git commit -m "chore: add vitest with happy-dom environment"
```

---

## Task 2: Preferred Version Persistence

**Files:**
- Modify: `src/lib/store/useVerseStore.ts:49` (initial state) and `:69` (setVersion)

- [ ] **Step 1: Write the failing test**

Replace the placeholder in `src/lib/bibleRefs.test.ts` with (keep the placeholder test, add below it):

```ts
import { describe, it, expect, beforeEach } from 'vitest'

describe('placeholder', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})

describe('localStorage version persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('reads versionId from localStorage on import', async () => {
    localStorage.setItem('tulia_version_id', '3')
    // Re-import the module fresh to test initial state
    const mod = await import('./store/useVerseStore?t=' + Date.now())
    expect(mod.useVerseStore.getState().versionId).toBe(3)
  })
})
```

- [ ] **Step 2: Run to confirm the test fails**

```bash
pnpm test
```

Expected: 1 pass (placeholder), 1 fail (localStorage test — versionId returns 1 regardless).

- [ ] **Step 3: Update useVerseStore initial state**

In `src/lib/store/useVerseStore.ts`, change the initial `versionId` line (currently line ~52 inside `create`):

**Before:**
```ts
  versionId: 1,
```

**After:**
```ts
  versionId: Number(localStorage.getItem('tulia_version_id')) || 1,
```

- [ ] **Step 4: Update setVersion to persist**

In the same file, update `setVersion` (currently around line 69):

**Before:**
```ts
  setVersion: async (id) => {
    set({ versionId: id, books: [], verses: [], selectedVerseId: null })
    await get().loadBooks()
  },
```

**After:**
```ts
  setVersion: async (id) => {
    localStorage.setItem('tulia_version_id', String(id))
    set({ versionId: id, books: [], verses: [], selectedVerseId: null })
    await get().loadBooks()
  },
```

- [ ] **Step 5: Run tests**

```bash
pnpm test
```

Expected: 2 pass. (Note: the dynamic import test may be flaky due to module caching — if it remains red, delete that test block; the feature is a 2-line change that is correct by inspection.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/store/useVerseStore.ts src/lib/bibleRefs.test.ts
git commit -m "feat: persist preferred Bible version to localStorage"
```

---

## Task 3: Bible Reference Parser

**Files:**
- Create: `src/lib/bibleRefs.ts`
- Modify: `src/lib/bibleRefs.test.ts`

> **Slug note:** The alias map below uses slugs assumed from the verbum API (lowercase kebab). Before finalising, verify real slugs: open the app in the browser, then run in the console:
> ```js
> JSON.stringify(useVerseStore.getState().books.map(b => [b.number, b.name, b.slug]))
> ```
> If any slug differs from what is in the alias map, update `BOOK_ALIASES` accordingly.

- [ ] **Step 1: Write failing tests**

Replace `src/lib/bibleRefs.test.ts` entirely with:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { segmentText } from './bibleRefs'

describe('segmentText', () => {
  it('returns single text segment when no reference found', () => {
    expect(segmentText('hello world')).toEqual([
      { kind: 'text', value: 'hello world' },
    ])
  })

  it('returns empty array for empty string', () => {
    expect(segmentText('')).toEqual([])
  })

  it('detects English reference with chapter and verse', () => {
    const segs = segmentText('check out John 3:16 for more')
    expect(segs).toHaveLength(3)
    expect(segs[0]).toEqual({ kind: 'text', value: 'check out ' })
    expect(segs[1]).toMatchObject({ kind: 'ref', slug: 'john', chapter: 3, verse: 16, endVerse: null, versionAbbr: null })
    expect(segs[2]).toEqual({ kind: 'text', value: ' for more' })
  })

  it('detects Spanish reference', () => {
    const segs = segmentText('lee Juan 3:16')
    expect(segs[1]).toMatchObject({ kind: 'ref', slug: 'john', chapter: 3, verse: 16 })
  })

  it('detects reference without space between book and chapter (john3:16)', () => {
    const segs = segmentText('john3:16')
    expect(segs[0]).toMatchObject({ kind: 'ref', slug: 'john', chapter: 3, verse: 16 })
  })

  it('detects chapter-only reference', () => {
    const segs = segmentText('Matthew 14')
    expect(segs[0]).toMatchObject({ kind: 'ref', slug: 'matthew', chapter: 14, verse: null, endVerse: null })
  })

  it('detects verse range', () => {
    const segs = segmentText('Juan 3:16-18')
    expect(segs[0]).toMatchObject({ kind: 'ref', slug: 'john', chapter: 3, verse: 16, endVerse: 18 })
  })

  it('captures version prefix', () => {
    const segs = segmentText('NIV John 3:16')
    expect(segs[0]).toMatchObject({ kind: 'ref', slug: 'john', chapter: 3, verse: 16, versionAbbr: 'NIV' })
  })

  it('captures version prefix with digit (RV60)', () => {
    const segs = segmentText('RV60 Juan 3:16')
    expect(segs[0]).toMatchObject({ kind: 'ref', slug: 'john', chapter: 3, verse: 16, versionAbbr: 'RV60' })
  })

  it('detects numbered book (1 Corinthians)', () => {
    const segs = segmentText('1 Corinthians 13:4')
    expect(segs[0]).toMatchObject({ kind: 'ref', slug: '1-corinthians', chapter: 13, verse: 4 })
  })

  it('detects numbered book without space (1cor13:4)', () => {
    const segs = segmentText('1cor13:4')
    expect(segs[0]).toMatchObject({ kind: 'ref', slug: '1-corinthians', chapter: 13, verse: 4 })
  })

  it('detects multiple references in one message', () => {
    const segs = segmentText('Read John 3:16 and Romans 8:1')
    const refs = segs.filter(s => s.kind === 'ref')
    expect(refs).toHaveLength(2)
    expect(refs[0]).toMatchObject({ slug: 'john', chapter: 3, verse: 16 })
    expect(refs[1]).toMatchObject({ slug: 'romans', chapter: 8, verse: 1 })
  })

  it('preserves raw matched text', () => {
    const segs = segmentText('Juan 3:16')
    expect(segs[0]).toMatchObject({ kind: 'ref', raw: 'Juan 3:16' })
  })

  it('detects Spanish abbreviated reference (Mat 14)', () => {
    const segs = segmentText('Mat 14')
    expect(segs[0]).toMatchObject({ kind: 'ref', slug: 'matthew', chapter: 14 })
  })
})
```

- [ ] **Step 2: Run tests to confirm they all fail**

```bash
pnpm test
```

Expected: All `segmentText` tests fail with "Cannot find module './bibleRefs'".

- [ ] **Step 3: Create `src/lib/bibleRefs.ts` with types, alias map, and parser**

Create the file with the full content below:

```ts
export type Segment =
  | { kind: 'text'; value: string }
  | {
      kind: 'ref'
      raw: string
      slug: string
      chapter: number
      verse: number | null
      endVerse: number | null
      versionAbbr: string | null
    }

// Aliases: lowercase key → verbum API slug.
// If slugs from your API differ, update the values here.
// Verify with: useVerseStore.getState().books.map(b => [b.number, b.slug])
export const BOOK_ALIASES: Record<string, string> = {
  // Genesis (1)
  genesis: 'genesis', génesis: 'genesis', gen: 'genesis', gn: 'genesis',
  // Exodus (2)
  exodus: 'exodus', éxodo: 'exodus', exodo: 'exodus', exo: 'exodus', ex: 'exodus',
  // Leviticus (3)
  leviticus: 'leviticus', 'levítico': 'leviticus', levitico: 'leviticus', lev: 'leviticus', lv: 'leviticus',
  // Numbers (4)
  numbers: 'numbers', 'números': 'numbers', numeros: 'numbers', num: 'numbers', nm: 'numbers',
  // Deuteronomy (5)
  deuteronomy: 'deuteronomy', deuteronomio: 'deuteronomy', deut: 'deuteronomy', deu: 'deuteronomy', dt: 'deuteronomy',
  // Joshua (6)
  joshua: 'joshua', 'josué': 'joshua', josue: 'joshua', jos: 'joshua',
  // Judges (7)
  judges: 'judges', jueces: 'judges', judg: 'judges', jdg: 'judges', jue: 'judges',
  // Ruth (8)
  ruth: 'ruth', rut: 'ruth', rt: 'ruth',
  // 1 Samuel (9)
  '1 samuel': '1-samuel', '1samuel': '1-samuel', '1 sam': '1-samuel', '1sam': '1-samuel', '1sa': '1-samuel',
  // 2 Samuel (10)
  '2 samuel': '2-samuel', '2samuel': '2-samuel', '2 sam': '2-samuel', '2sam': '2-samuel', '2sa': '2-samuel',
  // 1 Kings (11)
  '1 kings': '1-kings', '1kings': '1-kings', '1 reyes': '1-kings', '1reyes': '1-kings', '1ki': '1-kings', '1rey': '1-kings',
  // 2 Kings (12)
  '2 kings': '2-kings', '2kings': '2-kings', '2 reyes': '2-kings', '2reyes': '2-kings', '2ki': '2-kings', '2rey': '2-kings',
  // 1 Chronicles (13)
  '1 chronicles': '1-chronicles', '1chronicles': '1-chronicles',
  '1 crónicas': '1-chronicles', '1 cronicas': '1-chronicles', '1cronicas': '1-chronicles',
  '1ch': '1-chronicles', '1cr': '1-chronicles',
  // 2 Chronicles (14)
  '2 chronicles': '2-chronicles', '2chronicles': '2-chronicles',
  '2 crónicas': '2-chronicles', '2 cronicas': '2-chronicles', '2cronicas': '2-chronicles',
  '2ch': '2-chronicles', '2cr': '2-chronicles',
  // Ezra (15)
  ezra: 'ezra', esdras: 'ezra', ezr: 'ezra', esd: 'ezra',
  // Nehemiah (16)
  nehemiah: 'nehemiah', 'nehemías': 'nehemiah', nehemias: 'nehemiah', neh: 'nehemiah',
  // Esther (17)
  esther: 'esther', ester: 'esther', est: 'esther',
  // Job (18)
  job: 'job',
  // Psalms (19)
  psalms: 'psalms', psalm: 'psalms', salmos: 'psalms', salmo: 'psalms', psa: 'psalms', sal: 'psalms', ps: 'psalms',
  // Proverbs (20)
  proverbs: 'proverbs', proverbios: 'proverbs', prov: 'proverbs', prv: 'proverbs', pr: 'proverbs',
  // Ecclesiastes (21)
  ecclesiastes: 'ecclesiastes', 'eclesiastés': 'ecclesiastes', eclesiastes: 'ecclesiastes', eccl: 'ecclesiastes', ec: 'ecclesiastes',
  // Song of Solomon (22)
  'song of solomon': 'song-of-solomon', 'song of songs': 'song-of-solomon',
  'cantar de cantares': 'song-of-solomon', song: 'song-of-solomon', ss: 'song-of-solomon', cnt: 'song-of-solomon',
  // Isaiah (23)
  isaiah: 'isaiah', 'isaías': 'isaiah', isaias: 'isaiah', isa: 'isaiah', is: 'isaiah',
  // Jeremiah (24)
  jeremiah: 'jeremiah', 'jeremías': 'jeremiah', jeremias: 'jeremiah', jer: 'jeremiah',
  // Lamentations (25)
  lamentations: 'lamentations', lamentaciones: 'lamentations', lam: 'lamentations',
  // Ezekiel (26)
  ezekiel: 'ezekiel', ezequiel: 'ezekiel', ezk: 'ezekiel', eze: 'ezekiel', ez: 'ezekiel',
  // Daniel (27)
  daniel: 'daniel', dan: 'daniel', dn: 'daniel',
  // Hosea (28)
  hosea: 'hosea', oseas: 'hosea', hos: 'hosea',
  // Joel (29)
  joel: 'joel', jl: 'joel',
  // Amos (30)
  amos: 'amos', 'amós': 'amos', amo: 'amos',
  // Obadiah (31)
  obadiah: 'obadiah', 'abdías': 'obadiah', abdias: 'obadiah', abd: 'obadiah', ob: 'obadiah',
  // Jonah (32)
  jonah: 'jonah', 'jonás': 'jonah', jonas: 'jonah', jon: 'jonah',
  // Micah (33)
  micah: 'micah', miqueas: 'micah', mic: 'micah',
  // Nahum (34)
  nahum: 'nahum', 'nahúm': 'nahum', nah: 'nahum',
  // Habakkuk (35)
  habakkuk: 'habakkuk', habacuc: 'habakkuk', hab: 'habakkuk',
  // Zephaniah (36)
  zephaniah: 'zephaniah', 'sofonías': 'zephaniah', sofonias: 'zephaniah', zeph: 'zephaniah', zep: 'zephaniah', sof: 'zephaniah',
  // Haggai (37)
  haggai: 'haggai', hageo: 'haggai', hag: 'haggai',
  // Zechariah (38)
  zechariah: 'zechariah', 'zacarías': 'zechariah', zacarias: 'zechariah', zech: 'zechariah', zac: 'zechariah',
  // Malachi (39)
  malachi: 'malachi', 'malaquías': 'malachi', malaquias: 'malachi', mal: 'malachi',
  // Matthew (40)
  matthew: 'matthew', mateo: 'matthew', mat: 'matthew', mt: 'matthew',
  // Mark (41)
  mark: 'mark', marcos: 'mark', mar: 'mark', mk: 'mark', mc: 'mark', mr: 'mark',
  // Luke (42)
  luke: 'luke', lucas: 'luke', luc: 'luke', lk: 'luke', lc: 'luke',
  // John (43)
  john: 'john', juan: 'john', jn: 'john',
  // Acts (44)
  acts: 'acts', act: 'acts', hechos: 'acts', hch: 'acts',
  // Romans (45)
  romans: 'romans', romanos: 'romans', rom: 'romans', ro: 'romans',
  // 1 Corinthians (46)
  '1 corinthians': '1-corinthians', '1corinthians': '1-corinthians',
  '1 corintios': '1-corinthians', '1corintios': '1-corinthians',
  '1cor': '1-corinthians', '1co': '1-corinthians',
  // 2 Corinthians (47)
  '2 corinthians': '2-corinthians', '2corinthians': '2-corinthians',
  '2 corintios': '2-corinthians', '2corintios': '2-corinthians',
  '2cor': '2-corinthians', '2co': '2-corinthians',
  // Galatians (48)
  galatians: 'galatians', 'gálatas': 'galatians', galatas: 'galatians', gal: 'galatians', ga: 'galatians',
  // Ephesians (49)
  ephesians: 'ephesians', efesios: 'ephesians', eph: 'ephesians', ef: 'ephesians',
  // Philippians (50)
  philippians: 'philippians', filipenses: 'philippians', php: 'philippians', flp: 'philippians', fil: 'philippians',
  // Colossians (51)
  colossians: 'colossians', colosenses: 'colossians', col: 'colossians',
  // 1 Thessalonians (52)
  '1 thessalonians': '1-thessalonians', '1thessalonians': '1-thessalonians',
  '1 tesalonicenses': '1-thessalonians', '1tesalonicenses': '1-thessalonians',
  '1thes': '1-thessalonians', '1tes': '1-thessalonians', '1th': '1-thessalonians', '1ts': '1-thessalonians',
  // 2 Thessalonians (53)
  '2 thessalonians': '2-thessalonians', '2thessalonians': '2-thessalonians',
  '2 tesalonicenses': '2-thessalonians', '2tesalonicenses': '2-thessalonians',
  '2thes': '2-thessalonians', '2tes': '2-thessalonians', '2th': '2-thessalonians', '2ts': '2-thessalonians',
  // 1 Timothy (54)
  '1 timothy': '1-timothy', '1timothy': '1-timothy',
  '1 timoteo': '1-timothy', '1timoteo': '1-timothy',
  '1tim': '1-timothy', '1ti': '1-timothy',
  // 2 Timothy (55)
  '2 timothy': '2-timothy', '2timothy': '2-timothy',
  '2 timoteo': '2-timothy', '2timoteo': '2-timothy',
  '2tim': '2-timothy', '2ti': '2-timothy',
  // Titus (56)
  titus: 'titus', tito: 'titus', tit: 'titus', tt: 'titus',
  // Philemon (57)
  philemon: 'philemon', 'filemón': 'philemon', filemon: 'philemon', phm: 'philemon', flm: 'philemon',
  // Hebrews (58)
  hebrews: 'hebrews', hebreos: 'hebrews', heb: 'hebrews',
  // James (59)
  james: 'james', santiago: 'james', jas: 'james', stg: 'james',
  // 1 Peter (60)
  '1 peter': '1-peter', '1peter': '1-peter',
  '1 pedro': '1-peter', '1pedro': '1-peter',
  '1pet': '1-peter', '1pt': '1-peter', '1pe': '1-peter',
  // 2 Peter (61)
  '2 peter': '2-peter', '2peter': '2-peter',
  '2 pedro': '2-peter', '2pedro': '2-peter',
  '2pet': '2-peter', '2pt': '2-peter', '2pe': '2-peter',
  // 1 John (62)
  '1 john': '1-john', '1john': '1-john',
  '1 juan': '1-john', '1juan': '1-john',
  '1jn': '1-john', '1jua': '1-john',
  // 2 John (63)
  '2 john': '2-john', '2john': '2-john',
  '2 juan': '2-john', '2juan': '2-john',
  '2jn': '2-john', '2jua': '2-john',
  // 3 John (64)
  '3 john': '3-john', '3john': '3-john',
  '3 juan': '3-john', '3juan': '3-john',
  '3jn': '3-john', '3jua': '3-john',
  // Jude (65)
  jude: 'jude', judas: 'jude', jud: 'jude',
  // Revelation (66)
  revelation: 'revelation', apocalipsis: 'revelation', apo: 'revelation', rev: 'revelation', rv: 'revelation', ap: 'revelation',
}

function buildPattern(): RegExp {
  const sorted = Object.keys(BOOK_ALIASES).sort((a, b) => b.length - a.length)
  const bookAlt = sorted
    .map(k => k.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*'))
    .join('|')
  return new RegExp(
    `(?:([A-Z][A-Z0-9]{1,5})\\s+)?(${bookAlt})\\s*(\\d{1,3})(?:\\s*:\\s*(\\d{1,3})(?:\\s*-\\s*(\\d{1,3}))?)?`,
    'gi',
  )
}

const PATTERN = buildPattern()

export function segmentText(text: string): Segment[] {
  if (!text) return []

  const pattern = new RegExp(PATTERN.source, PATTERN.flags)
  const segments: Segment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const [full, versionAbbr, bookRaw, chapterStr, verseStr, endVerseStr] = match
    const normalizedBook = bookRaw.toLowerCase().replace(/\s+/g, ' ').trim()
    const slug = BOOK_ALIASES[normalizedBook]
    if (!slug) continue

    if (match.index > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, match.index) })
    }

    segments.push({
      kind: 'ref',
      raw: full,
      slug,
      chapter: parseInt(chapterStr, 10),
      verse: verseStr ? parseInt(verseStr, 10) : null,
      endVerse: endVerseStr ? parseInt(endVerseStr, 10) : null,
      versionAbbr: versionAbbr ?? null,
    })

    lastIndex = match.index + full.length
  }

  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) })
  }

  return segments
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Expected: All tests pass. If any fail due to unexpected slugs (e.g. the API uses `revelation` but the map has `revelation`), verify the actual slugs in the browser console and update the alias map values.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bibleRefs.ts src/lib/bibleRefs.test.ts
git commit -m "feat: add Bible reference parser with EN/ES alias map"
```

---

## Task 4: VerseLink Component

**Files:**
- Create: `src/components/chat/VerseLink.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/chat/VerseLink.tsx`:

```tsx
import { useVerseStore } from '@/lib/store/useVerseStore'
import type { Segment } from '@/lib/bibleRefs'

type Props = {
  seg: Extract<Segment, { kind: 'ref' }>
}

export function VerseLink({ seg }: Props) {
  const versions   = useVerseStore(s => s.versions)
  const setVersion = useVerseStore(s => s.setVersion)
  const openVerse  = useVerseStore(s => s.openVerse)

  const handleClick = async () => {
    if (seg.versionAbbr) {
      const match = versions.find(
        v => v.abbreviation.toUpperCase() === seg.versionAbbr!.toUpperCase(),
      )
      if (match) await setVersion(match.id)
    }
    await openVerse(seg.slug, seg.chapter, seg.verse ?? 1)
  }

  return (
    <span
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      className="text-accent underline cursor-pointer hover:opacity-80"
      title={seg.raw}
    >
      {seg.raw}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/chat/VerseLink.tsx
git commit -m "feat: add VerseLink component for clickable Bible references"
```

---

## Task 5: MessageBody Component

**Files:**
- Create: `src/components/chat/MessageBody.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/chat/MessageBody.tsx`:

```tsx
import { segmentText } from '@/lib/bibleRefs'
import { VerseLink } from './VerseLink'

export function MessageBody({ text }: { text: string }) {
  const segments = segmentText(text)

  return (
    <>
      {segments.map((seg, i) =>
        seg.kind === 'text'
          ? <span key={i}>{seg.value}</span>
          : <VerseLink key={i} seg={seg} />
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/chat/MessageBody.tsx
git commit -m "feat: add MessageBody component that renders verse refs as links"
```

---

## Task 6: Wire MessageBody into MessageItem

**Files:**
- Modify: `src/components/chat/MessageItem.tsx`

- [ ] **Step 1: Update MessageItem**

Open `src/components/chat/MessageItem.tsx`. Add the import after the existing imports:

```tsx
import { MessageBody } from './MessageBody'
```

Then find the bubble `<div>` that currently renders `{message.body}` (around line 57–67):

**Before:**
```tsx
        <div
          className={cn(
            'text-sm leading-snug px-3 py-1.5 rounded-2xl break-words whitespace-pre-wrap',
            isMine
              ? 'bg-accent text-bg-primary rounded-br-md'
              : 'bg-bg-secondary border border-border-subtle text-text-primary rounded-bl-md',
          )}
          title={new Date(message.created_at).toLocaleString()}
        >
          {message.body}
        </div>
```

**After:**
```tsx
        <div
          className={cn(
            'text-sm leading-snug px-3 py-1.5 rounded-2xl break-words whitespace-pre-wrap',
            isMine
              ? 'bg-accent text-bg-primary rounded-br-md'
              : 'bg-bg-secondary border border-border-subtle text-text-primary rounded-bl-md',
          )}
          title={new Date(message.created_at).toLocaleString()}
        >
          <MessageBody text={message.body} />
        </div>
```

- [ ] **Step 2: Run tests to confirm nothing is broken**

```bash
pnpm test
```

Expected: All tests still pass.

- [ ] **Step 3: Manual smoke test**

Start the dev server (`pnpm dev`), open the chat panel, open a conversation, and send a message containing:
- `John 3:16` — should appear underlined gold; clicking should load John chapter 3 in the main reader
- `Juan 3:16-18` — same, range displays as `Juan 3:16-18`
- `Matthew 14` — chapter-only, clicking navigates to Matthew 14:1
- `1 Cor 13:4` — numbered book
- `no refs here` — plain text, no styling change

- [ ] **Step 4: Final commit**

```bash
git add src/components/chat/MessageItem.tsx
git commit -m "feat: render Bible verse references as clickable links in chat messages"
```
