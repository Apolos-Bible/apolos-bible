import { api } from '@/lib/api'

export interface ReadingActivityPayload {
  book_name: string
  book_slug: string
  chapter: number
  verse: number
  version: string
}

let timer: ReturnType<typeof setTimeout> | null = null
let pending: ReadingActivityPayload | null = null

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

  pending = payload
  if (timer) return

  timer = setTimeout(() => {
    timer = null
    const next = pending
    pending = null
    if (next) {
      // Local calendar date — keeps the reading streak aligned with the
      // user's midnight instead of UTC's.
      const d = new Date()
      const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      void api.post('/api/user/reading-activity', { ...next, local_date: localDate }).catch(() => {
        /* best-effort telemetry — never surface to the user */
      })
    }
  }, 2500)
}
