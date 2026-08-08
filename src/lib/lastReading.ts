export const LAST_READING_KEY = 'verbum_last_reading'
export const LEGACY_LAST_READING_KEY = 'lastReading'

export type LastReading = { book: string; chapter: number; verse?: number }

function parseLastReading(raw: string | null): LastReading | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<LastReading>
    if (
      typeof parsed.book === 'string'
      && parsed.book.length > 0
      && Number.isInteger(parsed.chapter)
      && (parsed.chapter ?? 0) > 0
      && (parsed.verse === undefined || (Number.isInteger(parsed.verse) && parsed.verse > 0))
    ) {
      return { book: parsed.book, chapter: parsed.chapter!, ...(parsed.verse ? { verse: parsed.verse } : {}) }
    }
  } catch {
    // Invalid client state falls through to the default reader route.
  }
  return null
}

/** Read the current key first and migrate the pre-workspace key once. */
export function readLastReading(): LastReading | null {
  const current = parseLastReading(localStorage.getItem(LAST_READING_KEY))
  if (current) return current

  const legacy = parseLastReading(localStorage.getItem(LEGACY_LAST_READING_KEY))
  if (!legacy) return null

  localStorage.setItem(LAST_READING_KEY, JSON.stringify(legacy))
  localStorage.removeItem(LEGACY_LAST_READING_KEY)
  return legacy
}
