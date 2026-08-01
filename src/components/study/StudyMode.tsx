import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudyStore } from '@/lib/store/useStudyStore'
import { useChatStore } from '@/lib/store/useChatStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useStudySession } from '@/hooks/useStudySession'
import { getRandomCursorColor } from '@/lib/study/colors'
import { StudyTopBar } from './StudyTopBar'
import { StudyToolbar } from './StudyToolbar'
import { StudyCanvas } from './StudyCanvas'
import { BiblePanel } from './BiblePanel'
import { StudyChatWidget } from './StudyChatWidget'
import { GuidedPanel, GUIDED_PANEL_WIDTH } from './guided/GuidedPanel'
import { useIsMobile } from '@/lib/useIsMobile'
import { useGuidedStore } from '@/lib/store/useGuidedStore'
import { StudyDocContext } from '@/lib/study/StudyDocContext'
import { KeyboardScope, useCommands, focusWhenReady } from '@/lib/keyboard'
import type { DrawSettings } from './DrawingLayer'

export type Tool = 'select' | 'hand' | 'sticky' | 'verse' | 'draw' | 'erase'

export const DRAW_COLORS = ['#e5e7eb', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7'] as const
export const DRAW_SIZES = [2, 4, 8] as const

export function StudyMode() {
  return (
    <KeyboardScope scope="study">
      <StudyModeSurface />
    </KeyboardScope>
  )
}

function StudyModeSurface() {
  const navigate = useNavigate()
  const activeSession = useStudyStore(s => s.activeSession)
  const wsToken = useStudyStore(s => s.wsToken)
  const isGuest = useStudyStore(s => s.isGuest)
  const user = useAuthStore(s => s.user)
  const openAuthModal = useUIStore(s => s.openAuthModal)
  const [tool, setTool] = useState<Tool>('select')
  const [showInsertVerse, setShowInsertVerse] = useState(false)
  const [biblePanelOpen, setBiblePanelOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  // A guided session opens its walkthrough right away: the study is the point.
  // Guests only get the canvas — the walkthrough keeps personal answers, so it
  // needs an account.
  const guidedSlug = isGuest ? null : activeSession?.guided_study?.slug ?? null
  const [guidedOpen, setGuidedOpen] = useState(Boolean(guidedSlug))
  const isMobile = useIsMobile()

  // The guide docks to the right edge, so the floating chat has to step aside.
  // On mobile it takes the whole screen and the chat steps out entirely.
  const guideDocked = Boolean(guidedSlug) && guidedOpen
  const guideCoversScreen = guideDocked && isMobile
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

  /**
   * Is this study shared with anyone — online or not?
   *
   * Three signals, because none of them covers the others:
   *
   *  - `participants`: everyone who has ever opened the study. Persists when
   *    they leave, so an offline companion still counts. Captured on load, so it
   *    doesn't grow mid-session.
   *  - `pending_invitation_count`: someone invited who hasn't arrived yet. They
   *    have no participant row, but you can still write for them to read (and
   *    they get notified), so the chat has to be there.
   *  - awareness `users`: someone joining while we're already here.
   *
   * Only a study with nobody but you hides the chat.
   */
  const isShared =
    (activeSession?.participants?.length ?? 0) > 1 ||
    (activeSession?.pending_invitation_count ?? 0) > 0 ||
    users.length > 1

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

  // Opening a different study (or a free one) must not leave the previous
  // guided walkthrough loaded.
  useEffect(() => {
    setGuidedOpen(Boolean(guidedSlug))
    if (!guidedSlug) useGuidedStore.getState().clear()
    return () => useGuidedStore.getState().clear()
  }, [guidedSlug])

  // Guests can look but not edit; every mutating shortcut becomes a login
  // prompt instead of silently doing nothing.
  const guarded = (run: () => void) => () => {
    if (isGuest) {
      openAuthModal('login')
      return
    }
    run()
  }

  const adjustDrawSize = (delta: number) => {
    if (tool !== 'draw') return false
    setDrawSettings((s) => {
      const i = DRAW_SIZES.indexOf(s.size as typeof DRAW_SIZES[number])
      const next = Math.min(DRAW_SIZES.length - 1, Math.max(0, (i < 0 ? 0 : i) + delta))
      return { ...s, size: DRAW_SIZES[next] }
    })
  }

  // Registered separately so it disappears from the cheatsheet when there's no
  // chat to toggle — a listed shortcut that does nothing is worse than none.
  useCommands({ 'study.toggleChat': () => setChatOpen((v) => !v) }, { enabled: isShared })

  useCommands({
    'study.toolSelect': () => setTool('select'),
    'study.toolHand': () => setTool('hand'),
    'study.toolDraw': () => setTool('draw'),
    'study.toolErase': () => setTool('erase'),
    'study.toggleBible': () => setBiblePanelOpen((v) => !v),
    'study.toggleGuide': () => {
      if (!guidedSlug) return false
      setGuidedOpen((v) => !v)
    },

    // "/" opens the Bible tool straight into its search field.
    'study.bibleSearch': () => {
      setBiblePanelOpen(true)
      focusWhenReady('[data-bible-search]')
    },

    'study.addNote': guarded(() => {
      getActions()?.addStickyNote?.()
      setTool('select')
    }),
    'study.insertVerse': guarded(() => {
      setTool('verse')
      setShowInsertVerse(true)
    }),
    'study.undo': guarded(() => getActions()?.undo?.()),
    'study.redo': guarded(() => getActions()?.redo?.()),

    'study.askApolos': () => {
      const convId = useStudyStore.getState().activeSession?.conversation_id
      if (!convId) return false
      setChatOpen(true)
      useChatStore.getState().setComposerAudience(convId, 'apolos')
    },

    'study.drawSizeDown': () => adjustDrawSize(-1),
    'study.drawSizeUp': () => adjustDrawSize(1),
    'study.drawColor': (e) => {
      if (tool !== 'draw') return false
      const idx = Number(e.key) - 1
      if (idx < 0 || idx >= DRAW_COLORS.length) return false
      setDrawSettings((s) => ({ ...s, color: DRAW_COLORS[idx] }))
    },
  })

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
      <StudyTopBar users={users} isGuest={isGuest} doc={doc} />
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
          onOpenBiblePanel={() => setBiblePanelOpen(true)}
          chatOpen={chatOpen}
          showChat={isShared}
          onToggleChat={() => setChatOpen(v => !v)}
          guidedOpen={guidedOpen}
          onToggleGuided={guidedSlug ? () => setGuidedOpen(v => !v) : undefined}
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
          rightInset={guideDocked ? GUIDED_PANEL_WIDTH : 0}
        />
        <BiblePanel open={biblePanelOpen} onClose={() => setBiblePanelOpen(false)} isGuest={isGuest} />
        {guidedSlug && activeSession && (
          <GuidedPanel
            slug={guidedSlug}
            sessionId={activeSession.id}
            doc={doc}
            synced={synced}
            open={guidedOpen}
            onClose={() => setGuidedOpen(false)}
            isGuest={isGuest}
          />
        )}
        {/* `|| chatOpen` keeps Cmd/Ctrl+J working when studying alone: asking
            Apolos needs the composer, so that shortcut can still summon it. */}
        {!isGuest && activeSession?.conversation_id && !guideCoversScreen && (isShared || chatOpen) && (
          // Provide the shared Yjs doc so the chat composer can read/write the
          // attached AI context documents (StudyCanvas re-provides the same doc
          // internally for its nodes).
          <StudyDocContext.Provider value={doc}>
            <StudyChatWidget
              conversationId={activeSession.conversation_id}
              open={chatOpen}
              onOpenChange={setChatOpen}
              rightInset={guideDocked ? GUIDED_PANEL_WIDTH : 0}
            />
          </StudyDocContext.Provider>
        )}
      </div>
    </div>
  )
}
