export type AnalyticsConsent = 'granted' | 'denied'

const MEASUREMENT_ID = 'G-TRDMGBHZ47'
const CONSENT_STORAGE_KEY = 'apolos_analytics_consent'
const CONSENT_EVENT = 'apolos:analytics-consent'
const SCRIPT_ID = 'apolos-google-analytics'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function canUseGoogleAnalytics(
  hostname = typeof window !== 'undefined' ? window.location.hostname : '',
  tauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window,
): boolean {
  return !tauri && (hostname === 'apolos.bible' || hostname.endsWith('.apolos.bible'))
}

export function readAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === 'undefined') return null

  try {
    const consent = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    return consent === 'granted' || consent === 'denied' ? consent : null
  } catch {
    return null
  }
}

function gtag(...args: unknown[]) {
  if (!window.dataLayer) window.dataLayer = []
  window.dataLayer.push(args)
}

function updateGoogleConsent(consent: AnalyticsConsent) {
  gtag('consent', 'update', {
    analytics_storage: consent,
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
}

function loadGoogleAnalytics() {
  if (!canUseGoogleAnalytics() || document.getElementById(SCRIPT_ID)) return

  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`

  gtag('js', new Date())
  gtag('config', MEASUREMENT_ID, {
    send_page_view: false,
  })
  document.head.appendChild(script)
}

function removeGoogleAnalyticsCookies() {
  const domainCandidates = [
    undefined,
    window.location.hostname,
    '.apolos.bible',
  ]

  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0]?.trim()
    if (!name || !/^_ga(?:_|$)/.test(name)) return

    domainCandidates.forEach((domain) => {
      const domainAttribute = domain ? `; Domain=${domain}` : ''
      document.cookie = `${name}=; Max-Age=0; Path=/${domainAttribute}; SameSite=Lax`
    })
  })
}

export function initializeGoogleAnalytics() {
  if (!canUseGoogleAnalytics()) return

  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || gtag

  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500,
  })

  if (readAnalyticsConsent() === 'granted') {
    updateGoogleConsent('granted')
    loadGoogleAnalytics()
  }
}

export function setAnalyticsConsent(consent: AnalyticsConsent) {
  if (!canUseGoogleAnalytics()) return

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, consent)
  } catch {
    // The in-memory consent update still applies for this page.
  }

  updateGoogleConsent(consent)

  if (consent === 'granted') {
    loadGoogleAnalytics()
    trackAnalyticsPageView(window.location.pathname)
  } else {
    const analyticsWasLoaded = Boolean(document.getElementById(SCRIPT_ID))
    removeGoogleAnalyticsCookies()

    if (analyticsWasLoaded) {
      window.location.reload()
      return
    }
  }

  window.dispatchEvent(new CustomEvent<AnalyticsConsent>(CONSENT_EVENT, { detail: consent }))
}

export function onAnalyticsConsentChange(listener: (consent: AnalyticsConsent) => void) {
  const handler = (event: Event) => {
    listener((event as CustomEvent<AnalyticsConsent>).detail)
  }
  window.addEventListener(CONSENT_EVENT, handler)
  return () => window.removeEventListener(CONSENT_EVENT, handler)
}

export function sanitizeAnalyticsPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)

  if (segments[0] === 'chat') return '/chat/:conversationId'
  if (segments[0] === 'u') return '/u/:userId'
  if (segments[0] === 'study') return '/study/:sessionId'
  if (segments[0] === 'auth') return '/auth/callback'
  if (segments[0] === 'marketplace' && segments.length > 1) return '/marketplace/:path'
  if (segments[0] === 'mis-rutas' && segments.length > 1) {
    return segments.length > 2 ? '/mis-rutas/:path/:study' : '/mis-rutas/:path'
  }

  return pathname || '/'
}

export function trackAnalyticsPageView(pathname: string) {
  if (
    !canUseGoogleAnalytics()
    || readAnalyticsConsent() !== 'granted'
    || !document.getElementById(SCRIPT_ID)
  ) {
    return
  }

  const pagePath = sanitizeAnalyticsPath(pathname)
  gtag('event', 'page_view', {
    page_path: pagePath,
    page_location: `${window.location.origin}${pagePath}`,
    page_title: pagePath,
  })
}
