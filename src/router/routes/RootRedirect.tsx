import { Navigate } from 'react-router-dom'
import { useUIStore } from '@/lib/store/useUIStore'
import { paths } from '@/router/paths'
import { readLastReading } from '@/lib/lastReading'
import { useAuthStore } from '@/lib/store/useAuthStore'

export function preserveRootCallbackLocation(target: string, search: string, hash: string): string {
  return `${target}${search}${hash}`
}

export function RootRedirect() {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)
  if (loading) return null
  if (user) return <Navigate to={paths.home()} replace />
  const locale = useUIStore.getState().locale
  const last = readLastReading()
  const target = paths.bible({
    lang: locale,
    book: last?.book ?? 'genesis',
    chapter: last?.chapter ?? 1,
    verse: last?.verse ?? null,
  })
  // Preserve backend callback flags until RootLayout has consumed them.
  // RootLayout removes only its own flag and retains unrelated parameters.
  return <Navigate to={preserveRootCallbackLocation(target, window.location.search, window.location.hash)} replace />
}
