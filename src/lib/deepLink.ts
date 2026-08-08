import { isTauri } from '@tauri-apps/api/core'
import { onOpenUrl, getCurrent } from '@tauri-apps/plugin-deep-link'
import { authDeepLinkTarget } from '@/lib/authDeepLinkUrl'

type Navigate = (to: string, opts?: { replace?: boolean }) => void

function reportNativeAcceptance(target: string): void {
  const endpoint = import.meta.env.VITE_NATIVE_ACCEPTANCE_URL
  if (!endpoint) return
  const sanitizedTarget = target.replace(/#token=[^&]*/i, '#token=<present>')
  void fetch(endpoint, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: sanitizedTarget,
  }).catch(() => {})
}

/**
 * Forwards `tulia://auth/finish?...` deep links to the in-app
 * the matching provider finish route, where the SPA consumes `#token=`
 * and `?error=`. Any other scheme paths are ignored.
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
    if (typeof url !== 'string' || !url) return

    const target = authDeepLinkTarget(url)
    if (!target) {
      console.warn('[deepLink] ignored unsupported URL')
      return
    }
    reportNativeAcceptance(target)
    navigate(target, { replace: true })
  }

  let unlisten: (() => void) | undefined
  let disposed = false
  let lastHandledUrl: string | null = null

  const handleOnce = (url: string) => {
    if (disposed || url === lastHandledUrl) return
    lastHandledUrl = url
    handle(url)
  }

  void getCurrent()
    .then((urls) => {
      if (urls && urls.length > 0) handleOnce(urls[0])
    })
    .catch((err) => {
      console.warn('[deepLink] getCurrent failed:', err)
    })

  void onOpenUrl((urls) => {
    if (urls && urls.length > 0) handleOnce(urls[0])
  }).then((fn) => {
    if (disposed) fn()
    else unlisten = fn
  })

  return () => {
    disposed = true
    unlisten?.()
  }
}
