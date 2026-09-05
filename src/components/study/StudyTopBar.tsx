import { useState, useCallback } from 'react'
import { AssistantToggle } from '@/components/help/AssistantToggle'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, UserPlus, MoreHorizontal, Share2, Link, Eye, Download } from 'lucide-react'
import * as Y from 'yjs'
import { useStudyStore } from '@/lib/store/useStudyStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { paths } from '@/router/paths'
import { exportStudyToText, studyHasContent } from '@/lib/study/exportStudy'
import { StudyParticipants } from './StudyParticipants'
import { InviteModal } from './InviteModal'
import type { AwarenessUser } from '@/hooks/useStudySession'

export function StudyTopBar({ users, isGuest, canEdit, canManage, doc }: { users: AwarenessUser[]; isGuest: boolean; canEdit: boolean; canManage: boolean; doc: Y.Doc | null }) {
  const { t } = useTranslation();
  const navigate = useNavigate()
  const activeSession = useStudyStore(s => s.activeSession)
  const end = useStudyStore(s => s.end)
  const generateShareLink = useStudyStore(s => s.generateShareLink)
  const shareToken = useStudyStore(s => s.shareToken)
  const openAuthModal = useUIStore(s => s.openAuthModal)
  const addToast = useUIStore(s => s.addToast)
  const user = useAuthStore(s => s.user)
  const [title, setTitle] = useState(activeSession?.title ?? '')
  const [showMenu, setShowMenu] = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  const handleShare = useCallback(async () => {
    try {
      const session = useStudyStore.getState().activeSession
      let url: string | null = null
      try {
        url = await generateShareLink()
      } catch (err) {
        console.warn('[StudyTopBar] generateShareLink failed, falling back', err)
      }
      if (!url && session) {
        const token = useStudyStore.getState().shareToken
        if (token) {
          url = `${window.location.origin}${paths.study({ sessionId: session.id, shareToken: token })}`
        }
      }
      if (!url) {
        addToast('Could not create share link', 'error')
        return
      }
      await navigator.clipboard.writeText(url)
      addToast('Share link copied to clipboard', 'success')
    } catch (err) {
      console.error('[StudyTopBar] share failed', err)
      addToast('Could not copy share link', 'error')
    }
  }, [generateShareLink, addToast])

  const handleEndSession = async () => {
    setShowMenu(false)
    await end()
    navigate('/')
  }

  const handleExportText = useCallback(async () => {
    if (!doc) {
      addToast(t('study.topBar.exportFailed'), 'error')
      return
    }
    try {
      const session = useStudyStore.getState().activeSession
      if (!studyHasContent(doc)) {
        addToast(t('study.topBar.exportEmpty'), 'info')
        return
      }
      const text = exportStudyToText({ doc, title: session?.title })
      await navigator.clipboard.writeText(text)
      addToast(t('study.topBar.exportCopied'), 'success')
    } catch (err) {
      console.error('[StudyTopBar] export failed', err)
      addToast(t('study.topBar.exportFailed'), 'error')
    }
  }, [doc, addToast, t])

  const handleExit = () => {
    navigate('/')
  }

  return (
    <div className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-2 md:h-12 md:gap-3 md:px-4">
      <AssistantToggle />
      <button
        onClick={handleExit}
        className="flex h-11 w-11 shrink-0 items-center justify-center gap-1.5 rounded-md text-sm text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary md:h-auto md:w-auto md:justify-start md:hover:bg-transparent"
        aria-label={t('study.topBar.exit')}
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden md:inline">{t('study.topBar.exit')}</span>
      </button>

      {isGuest && (
        <span className="flex items-center gap-1 text-2xs text-accent bg-accent/10 px-2 py-0.5 rounded-full shrink-0">
          <Eye className="w-3 h-3" />
          Guest
        </span>
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        readOnly={!canEdit}
        className="text-sm font-medium bg-transparent border-none outline-none text-text-primary min-w-0 flex-1"
      />

      {!isGuest && <div className="hidden md:block"><StudyParticipants users={users} /></div>}

      {canManage && user && (
        <button
          onClick={() => setShowInvite(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary md:h-7 md:w-7"
          title={t('study.topBar.invite')}
          aria-label={t('study.topBar.invite')}
        >
          <UserPlus className="w-4 h-4" />
        </button>
      )}

      {user && canManage && (
        <button
          onClick={handleShare}
          className="hidden h-7 w-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary md:flex"
          title="Copy share link"
          aria-label="Copy share link"
        >
          <Share2 className="w-4 h-4" />
        </button>
      )}

      {user && !isGuest && (
        <button
          onClick={handleExportText}
          className="hidden h-7 w-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary md:flex"
          title={t('study.topBar.exportText')}
          aria-label={t('study.topBar.exportText')}
        >
          <Download className="w-4 h-4" />
        </button>
      )}

      {!isGuest && user && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex h-11 w-11 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary md:h-7 md:w-7"
            title={t('study.topBar.more')}
            aria-label={t('study.topBar.more')}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-lg border border-border bg-surface py-1 shadow-lg">
                {canManage && <button
                  onClick={() => { setShowMenu(false); void handleShare() }}
                  className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary md:hidden"
                >
                  <Share2 className="h-4 w-4" />
                  Copy share link
                </button>}
                <button
                  onClick={() => { setShowMenu(false); void handleExportText() }}
                  className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary md:hidden"
                >
                  <Download className="h-4 w-4" />
                  {t('study.topBar.exportText')}
                </button>
                {canManage && <button
                  onClick={handleEndSession}
                  className="min-h-11 w-full px-3 text-left text-sm text-red-400 transition-colors hover:bg-bg-tertiary"
                >
                  {t('study.topBar.endSession')}
                </button>}
              </div>
            </>
          )}
        </div>
      )}

      {isGuest && (
        <button
          onClick={() => openAuthModal('login')}
          className="h-11 shrink-0 rounded-md px-2 text-xs text-accent hover:bg-accent/10"
        >
          Log in to edit
        </button>
      )}

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  )
}
