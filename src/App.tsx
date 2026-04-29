import { useEffect } from 'react'
import { PanelLayout } from '@/components/layout/PanelLayout'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { VerseList } from '@/components/verse/VerseList'
import { StudyPanel } from '@/components/study/StudyPanel'
import { FavoritesPanel } from '@/components/sidebar/FavoritesPanel'
import { MyNotesPanel } from '@/components/sidebar/MyNotesPanel'
import { FriendsPanel } from '@/components/friends/FriendsPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { Toast } from '@/components/ui/Toast'
import { KeyboardShortcutsPanel } from '@/components/ui/KeyboardShortcutsPanel'
import { SettingsModal } from '@/components/ui/SettingsModal'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { CompareVersionsModal } from '@/components/reading/CompareVersionsModal'
import { CrossReferencesPanel } from '@/components/reading/CrossReferencesPanel'
import { CommentaryPanel } from '@/components/reading/CommentaryPanel'
import { AuthModal } from '@/components/auth/AuthModal'
import { useUIStore } from '@/lib/store/useUIStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useBookmarkStore } from '@/lib/store/useBookmarkStore'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { useChatStore } from '@/lib/store/useChatStore'

export default function App() {
  const openCommandPalette = useUIStore(s => s.openCommandPalette)
  const activePanel        = useUIStore(s => s.activePanel)
  const commentaryOpen     = useUIStore(s => s.commentaryOpen)
  const authModalOpen      = useUIStore(s => s.authModalOpen)
  const closeAuthModal     = useUIStore(s => s.closeAuthModal)
  const navigateVerse = useVerseStore(s => s.navigateVerse)
  const selectedVerseId = useVerseStore(s => s.selectedVerseId)
  const loadBooks = useVerseStore(s => s.loadBooks)
  const authInit = useAuthStore(s => s.init)
  const user = useAuthStore(s => s.user)
  const loadBookmarks = useBookmarkStore(s => s.load)
  const loadFriends = useFriendStore(s => s.load)
  const loadChat = useChatStore(s => s.load)
  const resetChat = useChatStore(s => s.reset)
  const listenForChatUpdates = useChatStore(s => s.listenForUpdates)
  const stopChatUpdates = useChatStore(s => s.stopListeningForUpdates)

  useEffect(() => {
    authInit()
    loadBooks()
  }, [])

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

  const leftPanelContent = activePanel === 'favorites' ? <FavoritesPanel />
    : activePanel === 'my-notes' ? <MyNotesPanel />
    : activePanel === 'friends' ? <FriendsPanel />
    : activePanel === 'chat' ? <ChatPanel />
    : null

  return (
    <>
      <PanelLayout
        sidebar={<Sidebar />}
        main={<VerseList />}
        panel={commentaryOpen ? <CommentaryPanel /> : selectedVerseId ? <StudyPanel /> : null}
        leftPanel={leftPanelContent}
      />
      <CommandPalette />
      <Toast />
      <KeyboardShortcutsPanel />
      <SettingsModal />
      <AuthModal open={authModalOpen} onClose={closeAuthModal} />
      <ContextMenu />
      <CompareVersionsModal />
      <CrossReferencesPanel />
    </>
  )
}
