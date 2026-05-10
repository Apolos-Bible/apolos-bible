import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { Toast } from '@/components/ui/Toast'
import { KeyboardShortcutsPanel } from '@/components/ui/KeyboardShortcutsPanel'
import { SettingsModal } from '@/components/ui/SettingsModal'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { CompareVersionsModal } from '@/components/reading/CompareVersionsModal'
import { CrossReferencesPanel } from '@/components/reading/CrossReferencesPanel'
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

const VISITED_STORAGE_KEY = 'verbum_has_visited'
let hasLoggedStartupSettings = false

export function RootLayout() {
  const { t } = useTranslation()
  const openCommandPalette = useUIStore(s => s.openCommandPalette)
  const authModalOpen      = useUIStore(s => s.authModalOpen)
  const closeAuthModal     = useUIStore(s => s.closeAuthModal)
  const authModalMode      = useUIStore(s => s.authModalMode)
  const authModalKey       = useUIStore(s => s.authModalKey)
  const navigateVerse      = useVerseStore(s => s.navigateVerse)
  const navigateChapter    = useVerseStore(s => s.navigateChapter)
  const versions           = useVerseStore(s => s.versions)
  const versionId          = useVerseStore(s => s.versionId)
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
    void authInit()
  }, [authInit])

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
    void checkForAppUpdates(addToast, {
      installing: (version) => t('updater.installing', { version }),
      installed: t('updater.installed'),
      failed: t('updater.failed'),
    })
  }, [addToast, t])

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

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA'

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openCommandPalette()
        return
      }

      if (isInput) return

      if (e.key === 'j') navigateVerse('next')
      if (e.key === 'k') navigateVerse('prev')
      if (e.key === 'ArrowLeft')  { e.preventDefault(); navigateChapter('prev') }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigateChapter('next') }
      if (e.key === '?') useUIStore.getState().toggleShortcutsPanel()
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [openCommandPalette, navigateVerse, navigateChapter])

  return (
    <>
      <Outlet />
      <CommandPalette />
      <Toast />
      <KeyboardShortcutsPanel />
      <SettingsModal />
      <AuthModal key={authModalKey} open={authModalOpen} onClose={closeAuthModal} initialMode={authModalMode} />
      <ContextMenu />
      <CompareVersionsModal />
      <CrossReferencesPanel />
      <TutorialInvite />
      <TutorialOverlay />
    </>
  )
}
