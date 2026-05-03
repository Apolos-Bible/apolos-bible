import { bibleApi, type ApiSearchResult } from './bibleApi';
import { BOOK_ALIASES } from './bibleRefs';

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
