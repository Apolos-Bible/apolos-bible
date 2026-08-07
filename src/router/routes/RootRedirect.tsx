import { Navigate } from 'react-router-dom'
import { useUIStore } from '@/lib/store/useUIStore'
import { paths } from '@/router/paths'
import { readLastReading } from '@/lib/lastReading'

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
