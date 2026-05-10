import { isTauri } from '@tauri-apps/api/core'
import { onOpenUrl, getCurrent } from '@tauri-apps/plugin-deep-link'

type Navigate = (to: string, opts?: { replace?: boolean }) => void

/**
 * Forwards `tulia://auth/finish?...` deep links to the in-app
 * `/auth/google/finish?...` route, where GoogleFinishRoute already
 * handles `#token=` and `?error=`. Any other scheme paths are ignored.
 *
 * Listens both to URLs the app is launched with (cold start) and to
 * URLs received while running.
 */
export function registerAuthDeepLink(navigate: Navigate): () => void {
  if (!isTauri()) return () => {}

  const handle = (url: string) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'tulia:') return
      if (parsed.host !== 'auth' || parsed.pathname !== '/finish') return
      navigate(`/auth/google/finish${parsed.search}${parsed.hash}`, { replace: true })
    } catch {
      // not a valid URL — ignore
    }
  }

  let unlisten: (() => void) | undefined

  void getCurrent()
    .then((urls) => {
      if (urls && urls.length > 0) handle(urls[0])
    })
    .catch(() => {})

  void onOpenUrl((urls) => {
    if (urls && urls.length > 0) handle(urls[0])
  }).then((fn) => {
    unlisten = fn
  })

  return () => {
    unlisten?.()
  }
}
