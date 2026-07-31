import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { paths } from './paths'
import { KeyboardProvider, useCommands } from '@/lib/keyboard'
import { RegionNav } from '@/components/a11y/RegionNav'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { Toast } from '@/components/ui/Toast'
import { KeyboardShortcutsPanel } from '@/components/ui/KeyboardShortcutsPanel'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { AuthModal } from '@/components/auth/AuthModal'
import { TutorialInvite } from '@/components/tutorial/TutorialInvite'
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay'
import { useUIStore } from '@/lib/store/useUIStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useBookmarkStore } from '@/lib/store/useBookmarkStore'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { useChatStore } from '@/lib/store/useChatStore'
import { checkForAppUpdates } from '@/lib/updater'
import { registerAuthDeepLink } from '@/lib/deepLink'
import { useIsMobile } from '@/lib/useIsMobile'
import { isWorkspaceRoute } from './paths'
import { WorkspaceDesktopShell } from '@/components/layout/WorkspaceDesktopShell'
import { AnalyticsConsentBanner } from '@/components/privacy/AnalyticsConsentBanner'
import { trackAnalyticsPageView } from '@/lib/analytics'

const VISITED_STORAGE_KEY = 'verbum_has_visited'
let hasLoggedStartupSettings = false

export function RootLayout() {
  return (
    <KeyboardProvider>
      <RootLayoutSurface />
    </KeyboardProvider>
  )
}

function RootLayoutSurface() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()
  const openCommandPalette = useUIStore(s => s.openCommandPalette)
  const authModalOpen      = useUIStore(s => s.authModalOpen)
  const keepScreenAwake    = useUIStore(s => s.keepScreenAwake)
  const closeAuthModal     = useUIStore(s => s.closeAuthModal)
  const authModalMode      = useUIStore(s => s.authModalMode)
  const authModalKey       = useUIStore(s => s.authModalKey)
  const versions           = useVerseStore(s => s.versions)
  const versionId          = useVerseStore(s => s.versionId)
  const setDefaultVersionForLocale = useVerseStore(s => s.setDefaultVersionForLocale)
  const selectedBook       = useVerseStore(s => s.selectedBook)
  const locale             = useUIStore(s => s.locale)
  const authInit           = useAuthStore(s => s.init)
  const user               = useAuthStore(s => s.user)
  const loadBookmarks      = useBookmarkStore(s => s.load)
  const loadFriends        = useFriendStore(s => s.load)
  const loadChat           = useChatStore(s => s.load)
  const resetChat          = useChatStore(s => s.reset)
  const listenForChatUpdates = useChatStore(s => s.listenForUpdates)
  const stopChatUpdates    = useChatStore(s => s.stopListeningForUpdates)
  const addToast           = useUIStore(s => s.addToast)

  useEffect(() => {
    trackAnalyticsPageView(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    void authInit()
  }, [authInit])

  useEffect(() => {
    void setDefaultVersionForLocale(locale)
  }, [locale, setDefaultVersionForLocale])

  // Handle ?email_verified=1 / =invalid query coming back from the backend
  // verification redirect. Show a toast, refresh the user, then strip the
  // query so it doesn't fire again on reload.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const flag = params.get('email_verified')
    if (!flag) return

    if (flag === '1') {
      addToast(t('auth.emailVerified', 'Correo verificado.'), 'success')
      void useAuthStore.getState().refreshUser()
    } else {
      addToast(
        t('auth.emailVerifyFailed', 'No pudimos verificar el correo. El enlace puede haber caducado.'),
        'error',
      )
    }

    params.delete('email_verified')
    const qs = params.toString()
    const newUrl = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash
    window.history.replaceState({}, '', newUrl)
  }, [addToast, t])

  useEffect(() => {
    if (hasLoggedStartupSettings || !selectedBook) return

    const firstVisit = localStorage.getItem(VISITED_STORAGE_KEY) !== 'true'
    const version = versions.find((item) => item.id === versionId)

    console.info('[Verbum settings]', {
      locale,
      bibleVersion: version
        ? {
            id: version.id,
            abbreviation: version.abbreviation,
            name: version.name,
            language: version.language,
          }
        : { id: versionId },
      firstVisit,
    })

    localStorage.setItem(VISITED_STORAGE_KEY, 'true')
    hasLoggedStartupSettings = true
  }, [locale, selectedBook, versionId, versions])

  useEffect(() => {
    if (localStorage.getItem('autoUpdate') === 'false') return
    void checkForAppUpdates(addToast, {
      installing: (version) => t('updater.installing', { version }),
      installed: t('updater.installed'),
      failed: t('updater.failed'),
    })
  }, [addToast, t])

  useEffect(() => {
    if (!keepScreenAwake || !('wakeLock' in navigator)) return
    let released = false
    let lock: { release: () => Promise<void> } | null = null
    const acquire = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        lock = await (navigator as Navigator & { wakeLock: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock.request('screen')
        if (released) await lock.release()
      } catch { /* unsupported or denied by the platform */ }
    }
    void acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', acquire)
      void lock?.release()
    }
  }, [keepScreenAwake])

  useEffect(() => {
    return registerAuthDeepLink((to, opts) => navigate(to, opts))
  }, [navigate])

  useEffect(() => {
    if (!user) {
      stopChatUpdates()
      resetChat()
      return
    }
    loadBookmarks()
    loadFriends()
    loadChat()
    listenForChatUpdates(user.id)

    return () => {
      stopChatUpdates()
    }
  }, [user, loadBookmarks, loadFriends, loadChat, resetChat, listenForChatUpdates, stopChatUpdates])

  // App-wide shortcuts. Reader- and study-specific keys register themselves in
  // their own scopes, so they can't fire on routes where they'd be meaningless.
  useCommands({
    'app.commandPalette': () => openCommandPalette(),
    'app.search': () => openCommandPalette(),
    'app.shortcuts': () => useUIStore.getState().toggleShortcutsPanel(),
    'app.goHome': () => { navigate(paths.root()) },
    'app.goProfile': () => { navigate(paths.profile()) },
    'app.goSettings': () => { navigate(paths.settings()) },
  })

  return (
    <>
      <RegionNav />
      {!isMobile && isWorkspaceRoute(location.pathname)
        ? <WorkspaceDesktopShell />
        : <Outlet />}
      <CommandPalette />
      <Toast />
      <KeyboardShortcutsPanel />
      <AuthModal key={authModalKey} open={authModalOpen} onClose={closeAuthModal} initialMode={authModalMode} />
      <ContextMenu />
      <TutorialInvite />
      <TutorialOverlay />
      <AnalyticsConsentBanner />
    </>
  )
}
