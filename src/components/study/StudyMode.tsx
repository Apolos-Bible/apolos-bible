import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudyStore } from '@/lib/store/useStudyStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useStudySession } from '@/hooks/useStudySession'
import { getRandomCursorColor } from '@/lib/study/colors'
import { StudyTopBar } from './StudyTopBar'
import { StudyToolbar } from './StudyToolbar'
import { StudyCanvas } from './StudyCanvas'
import { BiblePanel } from './BiblePanel'
import { StudyChatWidget } from './StudyChatWidget'
import type { DrawSettings } from './DrawingLayer'

export type Tool = 'select' | 'hand' | 'sticky' | 'verse' | 'draw' | 'erase'

export const DRAW_COLORS = ['#e5e7eb', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7'] as const
export const DRAW_SIZES = [2, 4, 8] as const

export function StudyMode() {
  const navigate = useNavigate()
  const activeSession = useStudyStore(s => s.activeSession)
  const wsToken = useStudyStore(s => s.wsToken)
  const isGuest = useStudyStore(s => s.isGuest)
  const user = useAuthStore(s => s.user)
  const openAuthModal = useUIStore(s => s.openAuthModal)
  const [tool, setTool] = useState<Tool>('select')
  const [showInsertVerse, setShowInsertVerse] = useState(false)
  const [biblePanelOpen, setBiblePanelOpen] = useState(false)
  const [drawSettings, setDrawSettings] = useState<DrawSettings>({
    kind: 'pen',
    color: DRAW_COLORS[0],
    size: DRAW_SIZES[1],
    filled: false,
  })
  const [spaceHeld, setSpaceHeld] = useState(false)

  const sessionId = activeSession?.id ?? null
  const {
    doc,
    connected,
    synced,
    reconnectKey,
    users,
    setLocalCursor,
    setLocalUser,
    setLocalSelection,
    setLocalDragging,
  } = useStudySession(sessionId, wsToken)

  const getActions = useCallback(() => (window as any).__studyCanvasActions, [])

  useEffect(() => {
    if (user && !isGuest) {
      setLocalUser({
        id: user.id,
        name: user.name,
        color: getRandomCursorColor(),
      })
    }
  }, [user, setLocalUser, isGuest])

  useEffect(() => {
    if (!activeSession) navigate('/', { replace: true })
  }, [activeSession, navigate])

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

      if (isGuest) {
        if (!isInput) {
          if (e.key === 'n' || e.key === 'N' || e.key === 'i' || e.key === 'I' ||
              (e.key === 'z' && (e.metaKey || e.ctrlKey))) {
            e.preventDefault()
            openAuthModal('login')
          }
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
      if (e.key === 'd' || e.key === 'D') { setTool('draw'); return }
      if (e.key === 'e' || e.key === 'E') { setTool('erase'); return }

      if (tool === 'draw') {
        if (e.key === '[') {
          setDrawSettings(s => {
            const idx = Math.max(0, DRAW_SIZES.indexOf(s.size as typeof DRAW_SIZES[number]) - 1)
            return { ...s, size: DRAW_SIZES[idx] }
          })
          return
        }
        if (e.key === ']') {
          setDrawSettings(s => {
            const i = DRAW_SIZES.indexOf(s.size as typeof DRAW_SIZES[number])
            const idx = Math.min(DRAW_SIZES.length - 1, (i < 0 ? 0 : i) + 1)
            return { ...s, size: DRAW_SIZES[idx] }
          })
          return
        }
        const colorIdx = ['1', '2', '3', '4', '5', '6'].indexOf(e.key)
        if (colorIdx >= 0 && colorIdx < DRAW_COLORS.length) {
          setDrawSettings(s => ({ ...s, color: DRAW_COLORS[colorIdx] }))
          return
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showInsertVerse, getActions, isGuest, openAuthModal, tool])

  useEffect(() => {
    if (tool !== 'draw' && tool !== 'erase') {
      if (spaceHeld) setSpaceHeld(false)
      return
    }
    const isInputTarget = (t: EventTarget | null) => {
      const tag = (t as HTMLElement | null)?.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || (t as HTMLElement | null)?.isContentEditable
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      if (isInputTarget(e.target)) return
      e.preventDefault()
      setSpaceHeld(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      setSpaceHeld(false)
    }
    const onBlur = () => setSpaceHeld(false)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [tool, spaceHeld])

  return (
    <div className="fixed inset-0 z-50 bg-bg-primary flex flex-col">
      <StudyTopBar users={users} isGuest={isGuest} />
      {isGuest && (
        <div className="h-8 bg-accent/10 border-b border-accent/20 flex items-center justify-center gap-2 shrink-0">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-accent">
            <rect x="2" y="6" width="12" height="8" rx="1" />
            <path d="M5 6V4a3 3 0 0 1 6 0v2" strokeLinecap="round" />
          </svg>
          <span className="text-2xs text-accent">
            You are viewing this study as a guest
          </span>
          <button
            onClick={() => openAuthModal('login')}
            className="text-2xs text-accent underline hover:no-underline"
          >
            Log in to edit
          </button>
        </div>
      )}
      <div className="flex-1 relative">
        <StudyToolbar
          tool={tool}
          onToolChange={setTool}
          showInsertVerse={showInsertVerse}
          onOpenInsertVerse={() => setShowInsertVerse(true)}
          onCloseInsertVerse={() => { setShowInsertVerse(false); setTool('select') }}
          biblePanelOpen={biblePanelOpen}
          onToggleBiblePanel={() => setBiblePanelOpen(v => !v)}
          isGuest={isGuest}
          drawSettings={drawSettings}
          onDrawSettingsChange={setDrawSettings}
        />
        <StudyCanvas
          tool={tool}
          biblePanelOpen={biblePanelOpen}
          doc={doc}
          connected={connected}
          synced={synced}
          reconnectKey={reconnectKey}
          users={users}
          setLocalCursor={setLocalCursor}
          setLocalSelection={setLocalSelection}
          setLocalDragging={setLocalDragging}
          isGuest={isGuest}
          drawSettings={drawSettings}
          spaceHeld={spaceHeld}
        />
        <BiblePanel open={biblePanelOpen} onClose={() => setBiblePanelOpen(false)} />
        {!isGuest && activeSession?.conversation_id && (
          <StudyChatWidget conversationId={activeSession.conversation_id} />
        )}
      </div>
    </div>
  )
}
