import { api } from '@/lib/api'

export interface ReadingActivityPayload {
  book_name: string
  book_slug: string
  chapter: number
  verse: number
  version: string
}

const POSITION_DELAY_MS = 2500
const READ_DELAY_MS = 20_000

let positionTimer: ReturnType<typeof setTimeout> | null = null
let pendingPosition: ReadingActivityPayload | null = null
let readTimer: ReturnType<typeof setTimeout> | null = null
let pendingChapter: ReadingActivityPayload | null = null
let pendingChapterKey: string | null = null

function localDate(): string {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function publish(payload: ReadingActivityPayload, countAsRead: boolean): void {
  void api.post('/api/user/reading-activity', {
    ...payload,
    local_date: localDate(),
    count_as_read: countAsRead,
  }).catch(() => {
    /* best-effort telemetry — never surface to the user */
  })
}

/**
 * Records the user's current reading position on the server. Powers the
 * "Continuar leyendo" card and the reading-streak stat on the profile.
 *
 * Rapid navigation (arrow-key chapter flipping) is coalesced into a single
 * request carrying the latest position, fired at most once every few seconds.
 * No-op when signed out.
 */
export function pingReadingActivity(payload: ReadingActivityPayload): void {
  if (!localStorage.getItem('verbum_token')) return
  if (!payload.book_slug || !payload.book_name) return

  pendingPosition = payload
  if (!positionTimer) {
    positionTimer = setTimeout(() => {
      positionTimer = null
      const next = pendingPosition
      pendingPosition = null
      if (next) publish(next, false)
    }, POSITION_DELAY_MS)
  }

  const chapterKey = `${payload.version}|${payload.book_slug}|${payload.chapter}`
  pendingChapter = payload
  if (chapterKey === pendingChapterKey) return

  if (readTimer) clearTimeout(readTimer)
  pendingChapterKey = chapterKey
  readTimer = setTimeout(() => {
    readTimer = null
    const chapter = pendingChapter
    if (chapter && `${chapter.version}|${chapter.book_slug}|${chapter.chapter}` === chapterKey) {
      publish(chapter, true)
    }
  }, READ_DELAY_MS)
}
