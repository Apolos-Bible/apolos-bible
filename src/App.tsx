import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBibleRouter } from '@/lib/hooks/useBibleRouter'
import { PanelLayout } from '@/components/layout/PanelLayout'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { VerseList } from '@/components/verse/VerseList'
import { StudyPanel } from '@/components/study/StudyPanel'
import { FavoritesPanel } from '@/components/sidebar/FavoritesPanel'
import { MyNotesPanel } from '@/components/sidebar/MyNotesPanel'
import { MyStudiesPanel } from '@/components/study/MyStudiesPanel'
import { FriendsPanel } from '@/components/friends/FriendsPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { Toast } from '@/components/ui/Toast'
import { KeyboardShortcutsPanel } from '@/components/ui/KeyboardShortcutsPanel'
import { SettingsModal } from '@/components/ui/SettingsModal'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { CompareVersionsModal } from '@/components/reading/CompareVersionsModal'
import { CrossReferencesPanel } from '@/components/reading/CrossReferencesPanel'
import { StudyMode } from '@/components/study/StudyMode'
import { useStudyStore } from '@/lib/store/useStudyStore'
import { CommentaryPanel } from '@/components/reading/CommentaryPanel'
import { AuthModal } from '@/components/auth/AuthModal'
import { useUIStore } from '@/lib/store/useUIStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useBookmarkStore } from '@/lib/store/useBookmarkStore'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { useChatStore } from '@/lib/store/useChatStore'
import { checkForAppUpdates } from '@/lib/updater'

const VISITED_STORAGE_KEY = 'verbum_has_visited'
let hasLoggedStartupSettings = false

export default function App() {
  const initialRoute = useBibleRouter()
  const { t } = useTranslation()
  const openCommandPalette = useUIStore(s => s.openCommandPalette)
  const activePanel        = useUIStore(s => s.activePanel)
  const commentaryOpen     = useUIStore(s => s.commentaryOpen)
  const authModalOpen      = useUIStore(s => s.authModalOpen)
  const closeAuthModal     = useUIStore(s => s.closeAuthModal)
  const navigateVerse = useVerseStore(s => s.navigateVerse)
  const studyVerseId = useVerseStore(s => s.studyVerseId)
  const loadBooks = useVerseStore(s => s.loadBooks)
  const versions = useVerseStore(s => s.versions)
  const versionId = useVerseStore(s => s.versionId)
  const selectedBook = useVerseStore(s => s.selectedBook)
  const locale = useUIStore(s => s.locale)
  const authInit = useAuthStore(s => s.init)
  const user = useAuthStore(s => s.user)
  const authModalMode = useUIStore(s => s.authModalMode)
  const authModalKey = useUIStore(s => s.authModalKey)
  const openAuthModalFunc = useUIStore(s => s.openAuthModal)
  const loadBookmarks = useBookmarkStore(s => s.load)
  const loadFriends = useFriendStore(s => s.load)
  const loadChat = useChatStore(s => s.load)
  const resetChat = useChatStore(s => s.reset)
  const listenForChatUpdates = useChatStore(s => s.listenForUpdates)
  const stopChatUpdates = useChatStore(s => s.stopListeningForUpdates)
  const addToast = useUIStore(s => s.addToast)
  const studyMode = useUIStore(s => s.studyMode)
  const studyActiveSession = useStudyStore(s => s.activeSession)
  const studyWsToken = useStudyStore(s => s.wsToken)

  useEffect(() => {
    void (async () => {
      await authInit()
      if (initialRoute?.lang && initialRoute.lang !== useUIStore.getState().locale) {
        useUIStore.getState().setLocale(initialRoute.lang as 'en' | 'es')
      }
      await loadBooks(initialRoute ? { book: initialRoute.book, chapter: initialRoute.chapter, verse: initialRoute.verse } : undefined)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Detect reset-password params from email link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('reset_token')
    const email = params.get('reset_email')
    if (token && email) {
      openAuthModalFunc('reset-password')
      // Store token/email in sessionStorage so AuthModal can read them
      sessionStorage.setItem('reset_token', token)
      sessionStorage.setItem('reset_email', email)
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [openAuthModalFunc])

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
      if (e.key === '?') useUIStore.getState().toggleShortcutsPanel()
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [openCommandPalette, navigateVerse])

  if (studyMode && studyActiveSession && studyWsToken) {
    return <StudyMode />
  }

  const leftPanelContent = activePanel === 'favorites' ? <FavoritesPanel />
    : activePanel === 'my-notes' ? <MyNotesPanel />
    : activePanel === 'my-studies' ? <MyStudiesPanel />
    : activePanel === 'friends' ? <FriendsPanel />
    : activePanel === 'chat' ? <ChatPanel />
    : null

  return (
    <>
      <PanelLayout
        sidebar={<Sidebar />}
        main={<VerseList />}
        panel={commentaryOpen ? <CommentaryPanel /> : studyVerseId ? <StudyPanel /> : null}
        leftPanel={leftPanelContent}
      />
      <CommandPalette />
      <Toast />
      <KeyboardShortcutsPanel />
      <SettingsModal />
      <AuthModal key={authModalKey} open={authModalOpen} onClose={closeAuthModal} initialMode={authModalMode} />
      <ContextMenu />
      <CompareVersionsModal />
      <CrossReferencesPanel />
    </>
  )
}
