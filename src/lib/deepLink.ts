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
 *
 * Note: `new URL(...)` is unreliable for custom schemes on Android
 * WebView (it leaves host empty and stuffs everything in pathname),
 * so we parse with a regex tolerant to scheme://host/path?query#frag.
 */
export function registerAuthDeepLink(navigate: Navigate): () => void {
  if (!isTauri()) return () => {}

  const handle = (url: string) => {
    console.log('[deepLink] received:', url)
    if (typeof url !== 'string' || !url) return

    const match = url.match(/^tulia:\/*([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/i)
    if (!match) {
      console.warn('[deepLink] no scheme match:', url)
      return
    }
    const [, host, path, search = '', hash = ''] = match
    console.log('[deepLink] parsed:', { host, path, search, hash })

    const isAuthFinish =
      (host === 'auth' && (path === '/finish' || path === '')) ||
      (host === '' && /^\/*auth\/finish\/?$/.test(path)) ||
      /auth\/finish/i.test(`${host}${path}`)

    if (!isAuthFinish) {
      console.warn('[deepLink] not auth/finish:', `${host}${path}`)
      return
    }

    const target = `/auth/google/finish${search}${hash}`
    console.log('[deepLink] navigating to', target)
    navigate(target, { replace: true })
  }

  let unlisten: (() => void) | undefined

  void getCurrent()
    .then((urls) => {
      console.log('[deepLink] getCurrent:', urls)
      if (urls && urls.length > 0) handle(urls[0])
    })
    .catch((err) => {
      console.warn('[deepLink] getCurrent failed:', err)
    })

  void onOpenUrl((urls) => {
    console.log('[deepLink] onOpenUrl:', urls)
    if (urls && urls.length > 0) handle(urls[0])
  }).then((fn) => {
    unlisten = fn
  })

  return () => {
    unlisten?.()
  }
}
