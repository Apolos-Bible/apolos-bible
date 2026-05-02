import { useEffect, useState, useCallback } from 'react'
import { useStudyStore } from '@/lib/store/useStudyStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useStudySession } from '@/hooks/useStudySession'
import { getRandomCursorColor } from '@/lib/study/colors'
import { StudyTopBar } from './StudyTopBar'
import { StudyToolbar } from './StudyToolbar'
import { StudyCanvas } from './StudyCanvas'
import { BiblePanel } from './BiblePanel'

export type Tool = 'select' | 'hand' | 'sticky' | 'verse'

export function StudyMode() {
  const activeSession = useStudyStore(s => s.activeSession)
  const wsToken = useStudyStore(s => s.wsToken)
  const user = useAuthStore(s => s.user)
  const exitStudyMode = useUIStore(s => s.exitStudyMode)
  const [tool, setTool] = useState<Tool>('select')
  const [showInsertVerse, setShowInsertVerse] = useState(false)
  const [biblePanelOpen, setBiblePanelOpen] = useState(false)

  const sessionId = activeSession?.id ?? null
  const {
    doc,
    connected,
    reconnectKey,
    users,
    setLocalCursor,
    setLocalUser,
    setLocalSelection,
    setLocalDragging,
  } = useStudySession(sessionId, wsToken)

  const getActions = useCallback(() => (window as any).__studyCanvasActions, [])

  useEffect(() => {
    if (user) {
      setLocalUser({
        id: user.id,
        name: user.name,
        color: getRandomCursorColor(),
      })
    }
  }, [user, setLocalUser])

  useEffect(() => {
    if (!activeSession) {
      exitStudyMode()
    }
  }, [activeSession, exitStudyMode])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA'

      if (e.key === 'Escape') {
        if (showInsertVerse) {
          setShowInsertVerse(false)
          setTool('select')
        }
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        getActions()?.redo?.()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        getActions()?.undo?.()
        return
      }

      if (isInput) return

      if (e.key === 'v' || e.key === 'V') { setTool('select'); return }
      if (e.key === 'h' || e.key === 'H') { setTool('hand'); return }
      if (e.key === 'n' || e.key === 'N') {
        getActions()?.addStickyNote?.()
        setTool('select')
        return
      }
      if (e.key === 'i' || e.key === 'I') {
        setTool('verse')
        setShowInsertVerse(true)
        return
      }
      if (e.key === 'b' || e.key === 'B') {
        setBiblePanelOpen(v => !v)
        return
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [exitStudyMode, showInsertVerse, getActions])

  return (
    <div className="fixed inset-0 z-50 bg-bg-primary flex flex-col">
      <StudyTopBar users={users} />
      <div className="flex-1 relative">
        <StudyToolbar
          tool={tool}
          onToolChange={setTool}
          showInsertVerse={showInsertVerse}
          onOpenInsertVerse={() => setShowInsertVerse(true)}
          onCloseInsertVerse={() => { setShowInsertVerse(false); setTool('select') }}
          biblePanelOpen={biblePanelOpen}
          onToggleBiblePanel={() => setBiblePanelOpen(v => !v)}
        />
        <StudyCanvas
          tool={tool}
          biblePanelOpen={biblePanelOpen}
          doc={doc}
          connected={connected}
          reconnectKey={reconnectKey}
          users={users}
          setLocalCursor={setLocalCursor}
          setLocalSelection={setLocalSelection}
          setLocalDragging={setLocalDragging}
        />
        <BiblePanel open={biblePanelOpen} onClose={() => setBiblePanelOpen(false)} />
      </div>
    </div>
  )
}
