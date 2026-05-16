import { bibleApi, type ApiSearchResult } from './bibleApi';
import { BOOK_ALIASES } from './bibleRefs';
import { normalizeText } from './normalizeText';

interface BookLike {
  slug: string;
  name: string;
}

// Group BOOK_ALIASES by canonical slug — each canonical slug (e.g. 'john')
// gets the list of normalized aliases that map to it ('john', 'juan', 'jn',
// 'gospel of john', etc.). Note: BOOK_ALIASES values are canonical English
// slugs, but the user's API books may use localized slugs (Spanish RVR uses
// slug 'juan' for book 43). We therefore associate a book with its canonical
// slug by looking up its display name in BOOK_ALIASES, not by comparing
// b.slug — that's the multilingual bridge.
const ALIASES_BY_SLUG: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const [alias, slug] of Object.entries(BOOK_ALIASES)) {
    const norm = normalizeText(alias);
    const list = out[slug] ?? (out[slug] = []);
    if (!list.includes(norm)) list.push(norm);
  }
  return out;
})();

/** Lookup the canonical English slug for a book, given its display name in
 *  any supported language. Returns null when the name has no known alias. */
function canonicalSlugForName(name: string): string | null {
  const norm = normalizeText(name).trim();
  return BOOK_ALIASES[norm] ?? null;
}

/**
 * Match a free-text query against book aliases (multilingual via
 * BOOK_ALIASES) and the user's loaded book display names. Returns a
 * deduped list of Book-like entries preserving the order from `books`.
 *
 * Matching rules:
 *  - normalize accents/case
 *  - prefix match on the book's display name, OR
 *  - prefix match on any alias that resolves to the same canonical slug
 *    as the book (so "john" finds the Spanish "Juan" entry, "juan" finds
 *    the English "John" entry, etc.)
 *  - skip queries shorter than 2 chars (too noisy)
 */
export function findBookMatches<B extends BookLike>(
  query: string,
  books: readonly B[],
  limit = 8,
): B[] {
  const q = normalizeText(query.trim());
  if (q.length < 2) return [];

  const out: B[] = [];
  for (const b of books) {
    if (normalizeText(b.name).startsWith(q)) {
      out.push(b);
      if (out.length >= limit) break;
      continue;
    }

    const canonical = canonicalSlugForName(b.name) ?? b.slug;
    const aliases = ALIASES_BY_SLUG[canonical];
    if (aliases?.some((a) => a.startsWith(q))) {
      out.push(b);
      if (out.length >= limit) break;
    }
  }
  return out;
}

// Build regex from BOOK_ALIASES (sorted longest-first to avoid partial matches)
const PATTERN = (() => {
  const sorted = Object.keys(BOOK_ALIASES).sort((a, b) => b.length - a.length);
  const bookAlt = sorted
    .map((k) => k.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*'))
    .join('|');
  return new RegExp(
    `^(${bookAlt})\\s*(\\d{1,3})(?:\\s*:\\s*(\\d{1,3}))?$`,
    'i',
  );
})();

export interface ParsedReference {
  slug: string;
  chapter: number;
  verse: number | null;
}

/** Parse a query like "john 3:16" or "juan 3" into structured reference. Returns null if not a book reference. */
export function parseReferenceQuery(query: string): ParsedReference | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const match = PATTERN.exec(trimmed);
  if (!match) return null;

  const [, bookRaw, chapterStr, verseStr] = match;
  const normalizedBook = bookRaw.toLowerCase().replace(/\s+/g, ' ').trim();
  const slug = BOOK_ALIASES[normalizedBook];
  if (!slug) return null;

  return {
    slug,
    chapter: parseInt(chapterStr, 10),
    verse: verseStr ? parseInt(verseStr, 10) : null,
  };
}

/**
 * Search for verses by query. First tries to parse as a book reference
 * (e.g. "john 3:16") and fetches the chapter directly. Falls back to
 * full-text search if the query doesn't look like a reference.
 */
export async function searchVerses(
  versionId: number,
  query: string,
): Promise<ApiSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // Try reference-based lookup first
  const ref = parseReferenceQuery(trimmed);
  if (ref) {
    try {
      const chapter = await bibleApi.chapter(versionId, ref.slug, ref.chapter);

      let verses = chapter.verses;

      // If a specific verse was requested, filter to that verse
      if (ref.verse !== null) {
        verses = verses.filter((v) => v.number === ref.verse);
      }

      const isChapterQuery = ref.verse === null;
      const groupLabel = isChapterQuery
        ? `${chapter.book.name} ${chapter.chapter}`
        : undefined;

      return verses.map((v) => ({
        id: v.id,
        book: chapter.book.name,
        slug: chapter.book.slug,
        chapter: chapter.chapter,
        verse: v.number,
        text: v.text,
        chapterGroup: groupLabel,
      }));
    } catch {
      // Chapter fetch failed — fall through to text search
    }
  }

  // Fallback: full-text search
  try {
    return await bibleApi.search(versionId, trimmed);
  } catch {
    return [];
  }
}
