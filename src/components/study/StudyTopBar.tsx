import { useState } from 'react'
import { ChevronLeft, UserPlus, MoreHorizontal } from 'lucide-react'
import { useStudyStore } from '@/lib/store/useStudyStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { StudyParticipants } from './StudyParticipants'
import { InviteModal } from './InviteModal'
import type { AwarenessUser } from '@/hooks/useStudySession'

export function StudyTopBar({ users }: { users: AwarenessUser[] }) {
  const activeSession = useStudyStore(s => s.activeSession)
  const leave = useStudyStore(s => s.leave)
  const end = useStudyStore(s => s.end)
  const exitStudyMode = useUIStore(s => s.exitStudyMode)
  const [title, setTitle] = useState(activeSession?.title ?? '')
  const [showMenu, setShowMenu] = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  const handleEndSession = async () => {
    setShowMenu(false)
    await end()
    exitStudyMode()
  }

  return (
    <div className="h-12 border-b border-border flex items-center px-4 gap-3 shrink-0">
      <button
        onClick={exitStudyMode}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors shrink-0"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Exit</span>
      </button>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-sm font-medium bg-transparent border-none outline-none text-text-primary min-w-0 flex-1"
      />

      <StudyParticipants users={users} />

      <button
        onClick={() => setShowInvite(true)}
        className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        title="Invite"
      >
        <UserPlus className="w-4 h-4" />
      </button>

      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          title="More"
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
                End Session
              </button>
            </div>
          </>
        )}
      </div>

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  )
}
