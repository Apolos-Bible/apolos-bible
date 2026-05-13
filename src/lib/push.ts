import { getToken, onMessage, deleteToken } from 'firebase/messaging'
import { api } from '@/lib/api'
import { getFirebaseMessaging, VAPID_KEY } from '@/lib/firebase'

const TOKEN_STORAGE_KEY = 'verbum_push_token'

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function detectPlatform(): 'web' | 'desktop' | 'android' | 'ios' {
  if (!isTauri()) return 'web'
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('android')) return 'android'
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  return 'desktop'
}

function deviceLabel(): string {
  const platform = detectPlatform()
  const ua = navigator.userAgent
  if (platform === 'desktop') {
    if (ua.includes('Mac')) return 'Mac'
    if (ua.includes('Windows')) return 'Windows'
    if (ua.includes('Linux')) return 'Linux'
    return 'Desktop'
  }
  if (platform === 'web') {
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    return 'Browser'
  }
  return platform
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null

  // Older builds shipped a kill-switch /sw.js. If it's still registered,
  // unregister it before claiming /firebase-messaging-sw.js so the two
  // don't fight over the scope.
  const existing = await navigator.serviceWorker.getRegistrations()
  for (const reg of existing) {
    const url = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || ''
    if (url.endsWith('/sw.js')) {
      await reg.unregister()
    }
  }

  return navigator.serviceWorker.register('/firebase-messaging-sw.js')
}

export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window === 'undefined') return { ok: false, reason: 'no-window' }
  if (!('Notification' in window)) return { ok: false, reason: 'unsupported' }

  const platform = detectPlatform()

  // Android via Tauri: the native FirebaseMessagingService renders the
  // notifications. MainActivity injects `window.__TULIA_FCM_TOKEN__`
  // before the page boots; we just hand it to the backend.
  if (platform === 'android') {
    return registerAndroidToken()
  }

  // iOS via Tauri does not currently support web push (WKWebView limit).
  if (platform === 'ios') return { ok: false, reason: 'ios-needs-native-plugin' }

  if (Notification.permission === 'denied') return { ok: false, reason: 'denied' }
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission()
    if (result !== 'granted') return { ok: false, reason: 'denied' }
  }

  const messaging = await getFirebaseMessaging()
  if (!messaging) return { ok: false, reason: 'unsupported' }

  const swReg = await ensureServiceWorker()
  if (!swReg) return { ok: false, reason: 'no-sw' }

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swReg,
  })
  if (!token) return { ok: false, reason: 'no-token' }

  const previous = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (previous !== token) {
    await api.post('/api/push/subscriptions', {
      token,
      platform,
      device_label: deviceLabel(),
    })
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  }

  // When the app is foregrounded the SW does NOT fire onBackgroundMessage.
  // The chat already shows in-app via Reverb so we silently swallow these —
  // we only set up the listener so the SDK doesn't warn.
  onMessage(messaging, () => {
    // no-op: in-app UI handles foreground via WebSocket
  })

  return { ok: true }
}

async function readAndroidToken(): Promise<string | null> {
  // The native side sets this on document-start. If we got here before
  // that script ran (rare but possible during very fast hot reloads),
  // poll briefly. Bail after ~3s — nothing we can do without a token.
  const start = Date.now()
  while (Date.now() - start < 3000) {
    const t = (window as unknown as { __TULIA_FCM_TOKEN__?: string | null }).__TULIA_FCM_TOKEN__
    if (typeof t === 'string' && t.length > 0) return t
    await new Promise((r) => setTimeout(r, 200))
  }
  return null
}

async function registerAndroidToken(): Promise<{ ok: boolean; reason?: string }> {
  const token = await readAndroidToken()
  if (!token) return { ok: false, reason: 'no-android-token' }

  const previous = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (previous !== token) {
    await api.post('/api/push/subscriptions', {
      token,
      platform: 'android',
      device_label: 'Android',
    })
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  }
  return { ok: true }
}

export async function disablePush(): Promise<void> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    await api
      .delete(`/api/push/subscriptions/${encodeURIComponent(token)}`)
      .catch(() => {})
  }
  const messaging = await getFirebaseMessaging()
  if (messaging) await deleteToken(messaging).catch(() => {})
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export function pushPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}
