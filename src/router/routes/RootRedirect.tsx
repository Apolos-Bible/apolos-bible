import { Navigate } from 'react-router-dom'
import { useUIStore } from '@/lib/store/useUIStore'
import { paths } from '@/router/paths'

const LAST_READING_KEY = 'lastReading'

type LastReading = { book: string; chapter: number; verse?: number }

function readLastReading(): LastReading | null {
  try {
    const raw = localStorage.getItem(LAST_READING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LastReading>
    if (typeof parsed.book === 'string' && typeof parsed.chapter === 'number') {
      return { book: parsed.book, chapter: parsed.chapter, verse: parsed.verse }
    }
  } catch {
    // ignore
  }
  return null
}

export function RootRedirect() {
  const locale = useUIStore.getState().locale
  const last = readLastReading()
  const target = paths.bible({
    lang: locale,
    book: last?.book ?? 'genesis',
    chapter: last?.chapter ?? 1,
    verse: last?.verse ?? null,
  })
  return <Navigate to={target} replace />
}
