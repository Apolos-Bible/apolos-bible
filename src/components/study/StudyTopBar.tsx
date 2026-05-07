import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, UserPlus, MoreHorizontal, Share2, Link, Eye } from 'lucide-react'
import { useStudyStore } from '@/lib/store/useStudyStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { StudyParticipants } from './StudyParticipants'
import { InviteModal } from './InviteModal'
import type { AwarenessUser } from '@/hooks/useStudySession'

export function StudyTopBar({ users, isGuest }: { users: AwarenessUser[]; isGuest: boolean }) {
  const { t } = useTranslation();
  const activeSession = useStudyStore(s => s.activeSession)
  const leave = useStudyStore(s => s.leave)
  const end = useStudyStore(s => s.end)
  const generateShareLink = useStudyStore(s => s.generateShareLink)
  const shareToken = useStudyStore(s => s.shareToken)
  const exitStudyMode = useUIStore(s => s.exitStudyMode)
  const openAuthModal = useUIStore(s => s.openAuthModal)
  const addToast = useUIStore(s => s.addToast)
  const user = useAuthStore(s => s.user)
  const [title, setTitle] = useState(activeSession?.title ?? '')
  const [showMenu, setShowMenu] = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  const handleShare = useCallback(async () => {
    const url = await generateShareLink()
    if (url) {
      await navigator.clipboard.writeText(url)
      addToast('Share link copied to clipboard', 'success')
    }
  }, [generateShareLink, addToast])

  const handleEndSession = async () => {
    setShowMenu(false)
    await end()
    exitStudyMode()
  }

  const handleExit = () => {
    if (isGuest) {
      useStudyStore.getState().clearSession()
    }
    exitStudyMode()
  }

  return (
    <div className="h-12 border-b border-border flex items-center px-4 gap-3 shrink-0">
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors shrink-0"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>{t('study.topBar.exit')}</span>
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
        readOnly={isGuest}
        className="text-sm font-medium bg-transparent border-none outline-none text-text-primary min-w-0 flex-1"
      />

      {!isGuest && <StudyParticipants users={users} />}

      {!isGuest && user && (
        <button
          onClick={() => setShowInvite(true)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          title={t('study.topBar.invite')}
        >
          <UserPlus className="w-4 h-4" />
        </button>
      )}

      {user && !isGuest && (
        <button
          onClick={handleShare}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          title="Copy share link"
        >
          <Share2 className="w-4 h-4" />
        </button>
      )}

      {!isGuest && user && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            title={t('study.topBar.more')}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                <button
                  onClick={handleEndSession}
                  className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-bg-tertiary transition-colors"
                >
                  {t('study.topBar.endSession')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {isGuest && (
        <button
          onClick={() => openAuthModal('login')}
          className="text-xs text-accent hover:underline shrink-0"
        >
          Log in to edit
        </button>
      )}

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  )
}
