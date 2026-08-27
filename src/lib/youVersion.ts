import type { ApiBook, ApiVersion } from './bibleApi'
import { BOOK_ALIASES } from './bibleRefs'
import { normalizeText } from './normalizeText'

export const YOUVERSION_CLIENT_ID_OFFSET = 1_000_000_000

export interface YouVersionBible {
  id: number
  abbreviation: string
  localized_abbreviation?: string
  title: string
  localized_title?: string
  language_tag: string
  copyright?: string
  info?: string
  promotional_content?: string
  publisher_url?: string
  youversion_deep_link?: string
  books?: string[]
}

export interface YouVersionCatalogResponse {
  data: YouVersionBible[]
  total_size: number
  language: string
}

interface YouVersionIndexChapter {
  id: number | string
  passage_id: string
  title: number | string
}

interface YouVersionIndexBook {
  id: string
  title: string
  full_title?: string
  abbreviation?: string
  canon: 'old_testament' | 'new_testament' | 'deuterocanon'
  chapters: YouVersionIndexChapter[]
}

export interface YouVersionIndex {
  text_direction: string
  books: YouVersionIndexBook[]
}

export interface YouVersionPassage {
  id: string
  content: string
  reference: string
}

const CANONICAL_BOOKS = [
  ['GEN', 'genesis'], ['EXO', 'exodus'], ['LEV', 'leviticus'], ['NUM', 'numbers'],
  ['DEU', 'deuteronomy'], ['JOS', 'joshua'], ['JDG', 'judges'], ['RUT', 'ruth'],
  ['1SA', '1-samuel'], ['2SA', '2-samuel'], ['1KI', '1-kings'], ['2KI', '2-kings'],
  ['1CH', '1-chronicles'], ['2CH', '2-chronicles'], ['EZR', 'ezra'], ['NEH', 'nehemiah'],
  ['EST', 'esther'], ['JOB', 'job'], ['PSA', 'psalms'], ['PRO', 'proverbs'],
  ['ECC', 'ecclesiastes'], ['SNG', 'song-of-solomon'], ['ISA', 'isaiah'], ['JER', 'jeremiah'],
  ['LAM', 'lamentations'], ['EZK', 'ezekiel'], ['DAN', 'daniel'], ['HOS', 'hosea'],
  ['JOL', 'joel'], ['AMO', 'amos'], ['OBA', 'obadiah'], ['JON', 'jonah'],
  ['MIC', 'micah'], ['NAM', 'nahum'], ['HAB', 'habakkuk'], ['ZEP', 'zephaniah'],
  ['HAG', 'haggai'], ['ZEC', 'zechariah'], ['MAL', 'malachi'], ['MAT', 'matthew'],
  ['MRK', 'mark'], ['LUK', 'luke'], ['JHN', 'john'], ['ACT', 'acts'],
  ['ROM', 'romans'], ['1CO', '1-corinthians'], ['2CO', '2-corinthians'], ['GAL', 'galatians'],
  ['EPH', 'ephesians'], ['PHP', 'philippians'], ['COL', 'colossians'], ['1TH', '1-thessalonians'],
  ['2TH', '2-thessalonians'], ['1TI', '1-timothy'], ['2TI', '2-timothy'], ['TIT', 'titus'],
  ['PHM', 'philemon'], ['HEB', 'hebrews'], ['JAS', 'james'], ['1PE', '1-peter'],
  ['2PE', '2-peter'], ['1JN', '1-john'], ['2JN', '2-john'], ['3JN', '3-john'],
  ['JUD', 'jude'], ['REV', 'revelation'],
] as const

const BOOK_BY_USFM: Map<string, { number: number; slug: string }> = new Map(
  CANONICAL_BOOKS.map(([usfm, slug], index) => [usfm, { number: index + 1, slug }]),
)
const BOOK_BY_SLUG: Map<string, { number: number; usfm: string }> = new Map(
  CANONICAL_BOOKS.map(([usfm, slug], index) => [slug, { number: index + 1, usfm }]),
)

export function toYouVersionClientId(bibleId: number): number {
  return YOUVERSION_CLIENT_ID_OFFSET + bibleId
}

export function fromYouVersionClientId(clientId: number): number | null {
  const bibleId = clientId - YOUVERSION_CLIENT_ID_OFFSET
  return Number.isInteger(bibleId) && bibleId > 0 ? bibleId : null
}

export function isYouVersionVersion(version: Pick<ApiVersion, 'provider'> | undefined): boolean {
  return version?.provider === 'youversion'
}

export function youVersionBibleToApiVersion(bible: YouVersionBible): ApiVersion {
  return {
    id: toYouVersionClientId(bible.id),
    provider: 'youversion',
    providerId: bible.id,
    name: bible.localized_title || bible.title,
    abbreviation: bible.localized_abbreviation || bible.abbreviation,
    language: bible.language_tag,
    copyright: bible.copyright,
    info: bible.info,
    promotionalContent: bible.promotional_content,
    publisherUrl: safeExternalUrl(bible.publisher_url),
    deepLink: safeExternalUrl(bible.youversion_deep_link),
  }
}

export function youVersionIndexToApiBooks(index: YouVersionIndex): ApiBook[] {
  return index.books.flatMap((book) => {
    const canonical = BOOK_BY_USFM.get(book.id.toUpperCase())
    if (!canonical) return []

    const numericChapters = book.chapters
      .map((chapter) => Number(chapter.id))
      .filter((chapter) => Number.isInteger(chapter) && chapter > 0)

    return [{
      id: canonical.number,
      number: canonical.number,
      name: book.title,
      slug: canonical.slug,
      chapters_count: numericChapters.length
        ? Math.max(...numericChapters)
        : 0,
      usfm: book.id.toUpperCase(),
    }]
  })
}

export function usfmForBookSlug(slug: string): { number: number; usfm: string } | null {
  const normalized = normalizeText(slug).trim()
  const canonicalSlug = BOOK_ALIASES[normalized]
    ?? BOOK_ALIASES[normalized.replace(/-/g, ' ')]
    ?? normalized
  return BOOK_BY_SLUG.get(canonicalSlug) ?? null
}

export function remoteVerseApiId(
  bibleId: number,
  bookNumber: number,
  chapter: number,
  verse: number,
): number {
  return -(bibleId * 100_000_000 + bookNumber * 100_000 + chapter * 1_000 + verse)
}

export function isRemoteVerseApiId(apiId: number): boolean {
  return apiId < 0
}

export function parseYouVersionChapterHtml(html: string): Array<{ number: number; text: string }> {
  const document = new DOMParser().parseFromString(html, 'text/html')
  const delimiter = '\uE000YV\uE001'

  document.querySelectorAll('.yv-vlbl').forEach((label) => label.remove())
  document.querySelectorAll<HTMLElement>('.yv-v').forEach((marker) => {
    const number = Number(marker.getAttribute('v') ?? marker.dataset.verse)
    if (!Number.isInteger(number) || number < 1) return
    marker.replaceWith(document.createTextNode(
      `${delimiter}${number}${delimiter}${marker.textContent ?? ''}`,
    ))
  })

  const chunks = (document.body.textContent ?? '').split(delimiter)
  const verses: Array<{ number: number; text: string }> = []

  for (let index = 1; index + 1 < chunks.length; index += 2) {
    const number = Number(chunks[index])
    const text = chunks[index + 1].replace(/\s+/g, ' ').trim()
    if (Number.isInteger(number) && number > 0 && text) {
      verses.push({ number, text })
    }
  }

  return verses
}

export function safeExternalUrl(value?: string): string | undefined {
  if (!value) return undefined

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}
