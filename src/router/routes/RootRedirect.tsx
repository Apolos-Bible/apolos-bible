import { Navigate } from 'react-router-dom'
import { useUIStore } from '@/lib/store/useUIStore'
import { paths } from '@/router/paths'
import { readLastReading } from '@/lib/lastReading'
import { useAuthStore } from '@/lib/store/useAuthStore'

export function preserveRootCallbackLocation(target: string, search: string, hash: string): string {
  return `${target}${search}${hash}`
}

export function selectRootTarget(authenticated: boolean, home: string, reader: string): string {
  return authenticated ? home : reader
}

export function RootRedirect() {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)
  const locale = useUIStore.getState().locale
  const last = readLastReading()
  const reader = paths.bible({
    lang: locale,
    book: last?.book ?? 'genesis',
    chapter: last?.chapter ?? 1,
    verse: last?.verse ?? null,
  })
  if (loading) return null
  const target = selectRootTarget(!!user, paths.home(), reader)
  // Preserve backend callback flags until RootLayout has consumed them.
  // RootLayout removes only its own flag and retains unrelated parameters.
  return <Navigate to={preserveRootCallbackLocation(target, window.location.search, window.location.hash)} replace />
}
