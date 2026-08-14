import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowRight, ArrowUp, Check, CircleHelp, Copy, Crown, Flame, Gamepad2, GripVertical, Grid2X2, Link2, ListOrdered, Loader2, MapPin, MapPinned, Medal, PanelsTopLeft, PartyPopper, Play, Quote, RotateCcw, Share2, Star, Trophy, UsersRound, X, Zap } from 'lucide-react'
import { AppPageLayout } from '@/components/layout/AppPageLayout'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { gameApi, type GameAnswer, type GameQuestion, type GameRoom } from '@/lib/gameApi'
import { segmentText, type Segment } from '@/lib/bibleRefs'
import { initEcho, onEchoReconnect } from '@/lib/echo'
import { paths } from '@/router/paths'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { createWorkspaceTab, useWorkspaceStore } from '@/lib/store/useWorkspaceStore'
import { useWorkspacePane } from '@/components/layout/WorkspacePaneContext'
import { cn } from '@/lib/cn'
import { moveTimelineItem, moveTimelineItemByOffset, type TimelineDropPosition } from '@/lib/gameTimeline'
import { gameInviteUrl } from '@/lib/gameInvite'

export function GameRoomRoute() {
  const { roomId } = useParams<{ roomId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const friends = useFriendStore((state) => state.friends)
  const loadFriends = useFriendStore((state) => state.load)
  const addToast = useUIStore((state) => state.addToast)
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<number[]>([])

  const refresh = useCallback(async () => {
    if (!roomId) return
    try {
      setRoom(await gameApi.room(roomId))
    } catch {
      addToast(t('games.roomUnavailable'), 'error')
      navigate(paths.games(), { replace: true })
    } finally {
      setLoading(false)
    }
  }, [roomId, addToast, t, navigate])

  useEffect(() => { void refresh(); void loadFriends() }, [refresh, loadFriends])

  useEffect(() => {
    if (!roomId) return
    const echo = initEcho()
    const channel = echo?.private(`game.room.${roomId}`)
    channel?.listen('.room.updated', () => void refresh())
    const stopReconnectListener = onEchoReconnect(() => void refresh())
    const poll = window.setInterval(() => void refresh(), 5000)
    return () => {
      window.clearInterval(poll)
      stopReconnectListener()
      channel?.stopListening('.room.updated')
      echo?.leave(`game.room.${roomId}`)
    }
  }, [roomId, refresh])

  const run = async (action: () => Promise<GameRoom>, conflictKey?: string) => {
    setBusy(true)
    try { setRoom(await action()) }
    catch (error) {
      const status = error instanceof Error && 'status' in error ? (error as Error & { status: number }).status : null
      addToast(t(status === 409 && conflictKey ? conflictKey : 'games.error'), 'error')
      await refresh()
    }
    finally { setBusy(false) }
  }

  if (loading || !room || !user) {
    return <AppPageLayout title={t('games.title')}><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div></AppPageLayout>
  }

  const isHost = room.host_user_id === user.id

  return (
    <AppPageLayout title={t('games.gameNight')}>
      <div className="min-h-full bg-bg-primary">
        {room.status === 'lobby' && (
          <Lobby room={room} isHost={isHost} friends={friends} selectedFriends={selectedFriends} setSelectedFriends={setSelectedFriends} busy={busy}
            onInvite={() => void run(async () => { const next = await gameApi.invite(room.id, selectedFriends); setSelectedFriends([]); return next })}
            onStart={() => void run(() => gameApi.start(room.id))} />
        )}
        {room.status === 'playing' && (
          <Round room={room} userId={user.id} isHost={isHost} busy={busy}
            onAnswer={(answer) => void run(() => gameApi.answer(room.id, answer), 'games.answerClosed')}
            onReveal={() => void run(() => gameApi.reveal(room.id))}
            onAdvance={() => void run(() => gameApi.advance(room.id))} />
        )}
        {room.status === 'finished' && <Results room={room} isHost={isHost} busy={busy} onReplay={() => void run(() => gameApi.replay(room.id))} onBack={() => navigate(paths.games())} />}
      </div>
    </AppPageLayout>
  )
}

function Lobby({ room, isHost, friends, selectedFriends, setSelectedFriends, busy, onInvite, onStart }: {
  room: GameRoom; isHost: boolean; friends: Array<{ id: number; name: string; email: string; avatar_url?: string | null }>
  selectedFriends: number[]; setSelectedFriends: (ids: number[]) => void; busy: boolean; onInvite: () => void; onStart: () => void
}) {
  const { t } = useTranslation()
  const addToast = useUIStore((state) => state.addToast)
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code)
      addToast(t('games.codeCopied'), 'success')
    } catch {
      addToast(t('games.shareFailed'), 'error')
    }
  }
  const shareLobby = async () => {
    const url = gameInviteUrl(room.code)
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('games.shareTitle'),
          text: t('games.shareText'),
          url,
        })
        return
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      addToast(t('games.linkCopied'), 'success')
    } catch {
      addToast(t('games.shareFailed'), 'error')
    }
  }
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-6 md:grid-cols-[minmax(0,1fr)_320px] md:px-8 md:py-10">
      <section className="game-round-enter relative overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/[0.1] via-bg-secondary to-violet-500/[0.06] p-5 shadow-2xl shadow-accent/5 md:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative">
          <span className="text-2xs font-semibold uppercase tracking-[0.14em] text-accent">{t('games.lobby')}</span>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] text-text-primary md:text-4xl">{t('games.getReady')}</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-text-muted">{t('games.lobbyHint')}</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button type="button" onClick={() => void copyCode()} className="inline-flex items-center gap-3 rounded-2xl border border-dashed border-accent/35 bg-bg-primary/80 px-5 py-3.5 shadow-lg transition-transform hover:-translate-y-0.5">
              <span className="text-xs text-text-muted">{t('games.code')}</span><strong className="font-mono text-xl tracking-[0.22em] text-text-primary">{room.code}</strong><Copy className="h-4 w-4 text-accent" />
            </button>
            <button type="button" onClick={() => void shareLobby()} className="inline-flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/10 px-5 py-3.5 text-sm font-semibold text-accent shadow-lg transition-transform hover:-translate-y-0.5">
              <Share2 className="h-4 w-4" />{t('games.shareLobby')}
            </button>
          </div>
        </div>

        <div className="relative mt-7">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary"><UsersRound className="h-4 w-4 text-accent" />{t('games.players', { count: room.players.length })}</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {room.players.map((player) => (
              <div key={player.id} className="game-soft-pop flex items-center gap-3 rounded-2xl border border-border-subtle bg-bg-primary/80 px-3 py-3 shadow-sm">
                <UserAvatar name={player.name} email={player.email} src={player.avatar_url} size="lg" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{player.name}</span>
                {player.id === room.host_user_id && <Crown className="h-4 w-4 text-accent" />}
              </div>
            ))}
          </div>
        </div>

        {isHost ? (
          <button type="button" onClick={onStart} disabled={busy} className="game-cta-shine relative mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-amber-300 text-sm font-bold text-bg-primary shadow-xl shadow-accent/20 transition-transform hover:-translate-y-0.5 disabled:opacity-50 sm:w-auto sm:px-7">
            <Play className="h-4 w-4 fill-current" />{t('games.start')}
          </button>
        ) : <p className="mt-7 flex items-center gap-2 text-sm text-text-muted"><Loader2 className="h-4 w-4 animate-spin" />{t('games.waitingHost')}</p>}
      </section>

      <aside className="rounded-2xl border border-border-subtle bg-bg-secondary p-4 md:p-5">
        <h2 className="text-sm font-semibold text-text-primary">{t('games.inviteFriends')}</h2>
        {!isHost && <p className="mt-2 text-xs text-text-muted">{t('games.hostInvites')}</p>}
        {isHost && <div className="mt-3 space-y-1.5">
          {friends.length === 0 && <p className="py-4 text-xs text-text-muted">{t('games.noFriends')}</p>}
          {friends.map((friend) => {
            const selected = selectedFriends.includes(friend.id)
            const inRoom = room.players.some((player) => player.id === friend.id)
            return <button key={friend.id} type="button" disabled={inRoom} onClick={() => setSelectedFriends(selected ? selectedFriends.filter((id) => id !== friend.id) : [...selectedFriends, friend.id])} className={cn('flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors', selected ? 'border-accent bg-accent/10' : 'border-transparent hover:bg-bg-tertiary', inRoom && 'opacity-40')}>
              <UserAvatar name={friend.name} email={friend.email} src={friend.avatar_url} size="md" /><span className="min-w-0 flex-1 truncate text-xs text-text-primary">{friend.name}</span>{selected && <Check className="h-4 w-4 text-accent" />}
            </button>
          })}
          <button type="button" onClick={onInvite} disabled={busy || selectedFriends.length === 0} className="mt-3 h-10 w-full rounded-lg border border-accent bg-accent/10 text-xs font-semibold text-accent disabled:opacity-40">{t('games.sendInvites')}</button>
        </div>}
      </aside>
    </div>
  )
}

function Round({ room, userId, isHost, busy, onAnswer, onReveal, onAdvance }: { room: GameRoom; userId: number; isHost: boolean; busy: boolean; onAnswer: (answer: GameAnswer) => void; onReveal: () => void; onAdvance: () => void }) {
  const { t } = useTranslation()
  const [, tick] = useState(0)
  const [pendingAnswer, setPendingAnswer] = useState<GameAnswer | null>(null)
  useEffect(() => { const id = window.setInterval(() => tick((value) => value + 1), 1000); return () => window.clearInterval(id) }, [])
  useEffect(() => { setPendingAnswer(null) }, [room.current_round])
  const question = room.current_question!
  const elapsed = room.round_started_at ? Math.max(0, Math.floor((Date.now() - new Date(room.round_started_at).getTime()) / 1000)) : 0
  const remaining = Math.max(0, question.seconds - elapsed)
  const clueCount = question.type === 'who_am_i' ? Math.min(question.clues.length, 1 + Math.floor(elapsed / 7)) : question.clues.length
  const allAnswered = room.players.length > 0 && room.players.every((player) => player.answered)
  const me = room.players.find((player) => player.id === userId)
  const correct = room.phase === 'reveal' && me?.answer_correct === true
  const timedOut = room.phase === 'reveal' && room.my_answer === null
  const structured = question.type === 'timeline' || question.type === 'matching' || question.type === 'memory' || question.type === 'map'
  const memoryPairCount = new Set((question.memory_cards ?? []).map((card) => card.pair_id)).size
  const pendingComplete = typeof pendingAnswer === 'number'
    || (question.type === 'timeline' && Array.isArray(pendingAnswer) && pendingAnswer.length === (question.items?.length ?? 0))
    || (question.type === 'matching' && Array.isArray(pendingAnswer) && pendingAnswer.length === (question.left_items?.length ?? 0) && pendingAnswer.every((item) => item >= 0))
    || (question.type === 'memory' && Array.isArray(pendingAnswer) && pendingAnswer.length === memoryPairCount)
  const correctAnswerLabel = answerLabel(question)

  return (
    <div className="relative mx-auto w-full max-w-5xl overflow-hidden px-4 py-5 md:px-8 md:py-8">
      {correct && <GameConfetti key={`correct-${room.current_round}`} compact />}
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-accent/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-1/2 h-80 w-80 rounded-full bg-violet-500/[0.06] blur-3xl" />

      <div className="relative flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full border border-border-subtle bg-bg-tertiary shadow-inner"><div className="game-progress-shine h-full rounded-full bg-gradient-to-r from-accent/70 via-accent to-amber-300 transition-[width] duration-500" style={{ width: `${(((room.current_round ?? 0) + 1) / room.round_count) * 100}%` }} /></div>
        <span className="rounded-full border border-border-subtle bg-bg-secondary px-2.5 py-1 font-mono text-2xs font-semibold tabular-nums text-text-muted">{(room.current_round ?? 0) + 1}/{room.round_count}</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 font-mono text-2xs font-bold tabular-nums text-amber-300"><Zap className="h-3 w-3 fill-current" />{me?.score ?? 0}</span>
      </div>

      <section key={room.current_round} className={cn('game-round-enter relative mt-4 overflow-hidden rounded-3xl border bg-bg-secondary shadow-2xl shadow-black/10', correct ? 'border-emerald-400/30' : room.phase === 'reveal' && !timedOut ? 'border-red-400/20' : 'border-border-subtle')}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-accent/[0.08] to-transparent" />
        <header className="relative flex items-center justify-between border-b border-border-subtle px-4 py-3 md:px-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent/10 px-3 py-1.5 text-2xs font-bold uppercase tracking-[0.12em] text-accent"><Star className="h-3 w-3 fill-current" />{t(`games.category.${question.type}`)}</span>
          <TimerDial remaining={remaining} total={question.seconds} />
        </header>
        <div className="relative px-4 py-6 text-center md:px-10 md:py-9">
          {question.type === 'who_am_i' && <div className="game-float mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/20 to-violet-500/10 text-accent shadow-lg shadow-accent/10"><UsersRound className="h-9 w-9" /></div>}
          {question.type === 'timeline' && <div className="game-float mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-cyan-400/20 to-blue-500/10 text-cyan-300 shadow-lg shadow-cyan-500/10"><ListOrdered className="h-9 w-9" /></div>}
          {question.type === 'matching' && <div className="game-float mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-violet-400/25 bg-gradient-to-br from-violet-400/20 to-fuchsia-500/10 text-violet-300 shadow-lg shadow-violet-500/10"><Link2 className="h-9 w-9" /></div>}
          {question.type === 'memory' && <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-border-subtle bg-bg-secondary text-accent shadow-sm"><Grid2X2 className="h-9 w-9" /></div>}
          {question.type === 'map' && <div className="game-float mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-400/25 bg-gradient-to-br from-emerald-400/20 to-cyan-500/10 text-emerald-300 shadow-lg shadow-emerald-500/10"><MapPinned className="h-9 w-9" /></div>}
          {question.type === 'fill_blank' && <div className="game-float mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-300/25 bg-gradient-to-br from-amber-300/20 to-orange-500/10 text-amber-300 shadow-lg shadow-amber-500/10"><Quote className="h-9 w-9" /></div>}
          <QuestionPrompt question={question} reveal={room.phase === 'reveal'} />
          {question.clues.length > 0 && <div className="mx-auto mt-5 max-w-xl space-y-2">{question.clues.slice(0, clueCount).map((clue, index) => <p key={clue} className="game-clue-enter rounded-2xl border border-border-subtle bg-bg-tertiary/60 px-4 py-3 text-sm text-text-secondary shadow-sm" style={{ animationDelay: `${index * 90}ms` }}><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 font-mono text-2xs font-bold text-accent">{index + 1}</span>{clue}</p>)}</div>}

          {!structured && <div className={cn('mx-auto mt-6 grid max-w-2xl gap-2', question.options.length > 2 && 'sm:grid-cols-2')}>
            {question.options.map((option, index) => {
              const selected = (room.my_answer ?? pendingAnswer) === index
              const correct = room.phase === 'reveal' && question.correct_answer === index
              const wrong = room.phase === 'reveal' && selected && !correct
              return <button key={option} type="button" onClick={() => setPendingAnswer(index)} disabled={busy || remaining === 0 || room.my_answer !== null || room.phase === 'reveal'} className={cn('group relative min-h-16 overflow-hidden rounded-2xl border px-4 py-3 text-left text-sm font-semibold shadow-sm transition-all duration-200 active:scale-[0.98]', correct ? 'game-answer-correct border-emerald-400/60 bg-emerald-400/15 text-emerald-300 shadow-emerald-500/10' : wrong ? 'game-answer-wrong border-red-400/50 bg-red-400/10 text-red-300' : selected ? 'border-accent bg-accent/15 text-accent shadow-lg shadow-accent/10 ring-2 ring-accent/15' : 'border-border-subtle bg-bg-primary text-text-primary hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg', 'disabled:hover:translate-y-0')}><span className={cn('mr-3 inline-flex h-8 w-8 items-center justify-center rounded-xl border font-mono text-xs font-bold transition-colors', selected ? 'border-accent/30 bg-accent text-bg-primary' : 'border-border-subtle bg-bg-tertiary text-text-muted group-hover:border-accent/30 group-hover:text-accent')}>{String.fromCharCode(65 + index)}</span>{option}{selected && room.phase === 'question' && <Check className="float-right mt-2 h-4 w-4" />}{correct && <Check className="float-right mt-2 h-5 w-5" />}{wrong && <X className="float-right mt-2 h-5 w-5" />}</button>
            })}
          </div>}

          {question.type === 'timeline' && <TimelineAnswer question={question} value={room.my_answer ?? pendingAnswer} onChange={setPendingAnswer} disabled={busy || remaining === 0 || room.my_answer !== null || room.phase === 'reveal'} reveal={room.phase === 'reveal'} />}
          {question.type === 'matching' && <MatchingAnswer question={question} value={room.my_answer ?? pendingAnswer} onChange={setPendingAnswer} disabled={busy || remaining === 0 || room.my_answer !== null || room.phase === 'reveal'} reveal={room.phase === 'reveal'} />}
          {question.type === 'memory' && <MemoryAnswer question={question} value={room.my_answer ?? pendingAnswer} onChange={setPendingAnswer} disabled={busy || remaining === 0 || room.my_answer !== null || room.phase === 'reveal'} reveal={room.phase === 'reveal'} />}
          {question.type === 'map' && <MapAnswer question={question} value={room.my_answer ?? pendingAnswer} onChange={setPendingAnswer} disabled={busy || remaining === 0 || room.my_answer !== null || room.phase === 'reveal'} reveal={room.phase === 'reveal'} />}

          {room.my_answer === null && room.phase === 'question' && (
            <button type="button" onClick={() => pendingAnswer !== null && onAnswer(pendingAnswer)} disabled={busy || remaining === 0 || !pendingComplete} className="game-cta-shine mx-auto mt-4 inline-flex min-h-12 w-full max-w-2xl items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-amber-300 px-5 text-sm font-bold text-bg-primary shadow-lg shadow-accent/15 transition-transform hover:-translate-y-0.5 active:scale-[0.99] disabled:shadow-none disabled:opacity-40 disabled:hover:translate-y-0">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-current" />}{t('games.confirmAnswer')}
            </button>
          )}

          {room.my_answer !== null && room.phase === 'question' && <p className="game-soft-pop mt-5 inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.06] px-4 py-2 text-xs font-medium text-text-muted"><Check className="h-3.5 w-3.5 text-accent" />{t('games.answerLocked')}</p>}
          {room.phase === 'reveal' && <><RevealFeedback correct={correct} timedOut={timedOut} points={me?.answer_points ?? 0} correctAnswer={correctAnswerLabel} /><div className="game-soft-pop mx-auto mt-3 max-w-2xl rounded-2xl border border-accent/20 bg-accent/[0.05] px-4 py-4 text-left"><p className="text-sm leading-relaxed text-text-secondary">{question.explanation}</p><BibleReferenceLink reference={question.reference} /></div></>}
        </div>
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center"><div className="flex -space-x-2">{room.players.map((player) => <span key={player.id} className={cn('relative rounded-full ring-2 ring-bg-primary transition-all', player.answered ? 'scale-100 opacity-100' : 'scale-90 opacity-35')} title={`${player.name}${player.answered ? ' ✓' : ''}`}><UserAvatar name={player.name} email={player.email} src={player.avatar_url} size="lg" />{player.answered && <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400 text-[8px] text-black ring-2 ring-bg-primary">✓</span>}</span>)}</div><span className="ml-3 text-2xs font-medium text-text-muted">{t('games.answers', { count: room.players.filter((player) => player.answered).length, total: room.players.length })}</span></div>
        {isHost && room.phase === 'question' && <button type="button" onClick={onReveal} disabled={busy || (!allAnswered && remaining > 0)} className="rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-bg-primary disabled:cursor-not-allowed disabled:opacity-40">{allAnswered || remaining === 0 ? t('games.revealNow') : t('games.reveal')}</button>}
        {isHost && room.phase === 'reveal' && <button type="button" onClick={onAdvance} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-bg-primary">{(room.current_round ?? 0) + 1 === room.round_count ? t('games.results') : t('games.nextRound')}<ArrowRight className="h-4 w-4" /></button>}
        {!isHost && <span className="text-xs text-text-muted">{room.phase === 'reveal' ? t('games.waitingNext') : t('games.answers', { count: room.players.filter((player) => player.answered).length, total: room.players.length })}</span>}
      </div>
    </div>
  )
}

function QuestionPrompt({ question, reveal }: { question: GameQuestion; reveal: boolean }) {
  if (question.type !== 'fill_blank') {
    return <h1 className="mx-auto max-w-2xl text-2xl font-bold leading-tight tracking-[-0.02em] text-text-primary md:text-4xl">{question.prompt}</h1>
  }
  const parts = question.prompt.split('_____')
  const answer = reveal && typeof question.correct_answer === 'number' ? question.options[question.correct_answer] : null
  return <h1 className="mx-auto max-w-3xl text-2xl font-bold leading-relaxed tracking-[-0.02em] text-text-primary md:text-4xl">{parts.map((part, index) => <span key={index}>{part}{index < parts.length - 1 && <span className={cn('mx-1 inline-flex min-w-28 items-center justify-center rounded-xl border-b-2 px-3 py-0.5 align-baseline text-accent', answer ? 'game-answer-correct border-emerald-400 bg-emerald-400/10 text-emerald-300' : 'border-accent bg-accent/10')}>{answer ?? '••••••'}</span>}</span>)}</h1>
}

function answerLabel(question: GameQuestion): string {
  const answer = question.correct_answer
  if (typeof answer === 'number') return question.options[answer] ?? ''
  if (!Array.isArray(answer)) return ''
  if (question.type === 'timeline') {
    const byId = new Map((question.items ?? []).map((item) => [item.id, item.label]))
    return answer.map((id) => byId.get(id)).filter(Boolean).join(' → ')
  }
  if (question.type === 'matching') {
    return answer.map((rightIndex, leftIndex) => `${question.left_items?.[leftIndex] ?? ''} ↔ ${question.right_items?.[rightIndex] ?? ''}`).join(' · ')
  }
  if (question.type === 'memory') {
    return answer.map((pairId) => (question.memory_cards ?? []).filter((card) => card.pair_id === pairId).map((card) => card.label).join(' ↔ ')).join(' · ')
  }
  return ''
}

function TimelineAnswer({ question, value, onChange, disabled, reveal }: { question: GameQuestion; value: GameAnswer | null; onChange: (answer: GameAnswer) => void; disabled: boolean; reveal: boolean }) {
  const { t } = useTranslation()
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: number; position: TimelineDropPosition } | null>(null)
  const items = question.items ?? []
  const order = Array.isArray(value) ? value : []
  const byId = new Map(items.map((item) => [item.id, item]))
  const bank = useMemo(() => [...items].sort((a, b) => ((a.id * 3 + 1) % Math.max(1, items.length)) - ((b.id * 3 + 1) % Math.max(1, items.length))), [items])
    .filter((item) => !order.includes(item.id))
  const pick = (id: number) => {
    if (disabled) return
    onChange(order.includes(id) ? order.filter((item) => item !== id) : [...order, id])
  }
  const moveByOffset = (id: number, offset: -1 | 1) => {
    if (disabled) return
    onChange(moveTimelineItemByOffset(order, id, offset))
  }
  const finishDrag = () => {
    setDraggedId(null)
    setDropTarget(null)
  }

  return <div className="mx-auto mt-6 max-w-2xl text-left">
    <p className="mb-2 text-2xs font-bold uppercase tracking-[0.12em] text-text-muted">{t('games.timeline.yourOrder')}</p>
    {!reveal && order.length > 1 && <p className="mb-2 text-xs text-text-muted">{t('games.timeline.reorderHint')}</p>}
    <div className="relative space-y-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-3">
      <span className="absolute bottom-6 left-[31px] top-6 w-px bg-gradient-to-b from-cyan-300/70 to-cyan-300/10" aria-hidden="true" />
      {order.length === 0 && <p className="relative py-5 text-center text-xs text-text-muted">{t('games.timeline.hint')}</p>}
      {order.map((id, index) => {
        const item = byId.get(id)
        if (!item) return null
        const positionCorrect = reveal && Array.isArray(question.correct_answer) && question.correct_answer[index] === id
        const targetActive = dropTarget?.id === id
        return <div
          key={id}
          draggable={!disabled && !reveal}
          onDragStart={(event) => {
            setDraggedId(id)
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/plain', String(id))
          }}
          onDragOver={(event) => {
            if (disabled || draggedId === null || draggedId === id) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            const bounds = event.currentTarget.getBoundingClientRect()
            setDropTarget({ id, position: event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after' })
          }}
          onDrop={(event) => {
            event.preventDefault()
            if (draggedId !== null && dropTarget?.id === id) {
              onChange(moveTimelineItem(order, draggedId, id, dropTarget.position))
            }
            finishDrag()
          }}
          onDragEnd={finishDrag}
          className={cn(
            'game-soft-pop relative flex min-h-14 w-full items-center gap-2 rounded-xl border bg-bg-primary px-2.5 py-2 text-left shadow-sm transition-all',
            reveal ? positionCorrect ? 'border-emerald-400/40' : 'border-red-400/35' : 'border-cyan-400/25 hover:border-cyan-300/50',
            draggedId === id && 'scale-[0.98] opacity-45',
            targetActive && dropTarget.position === 'before' && 'before:absolute before:inset-x-2 before:-top-1 before:h-0.5 before:rounded-full before:bg-cyan-300 before:shadow-[0_0_10px_rgba(103,232,249,0.8)]',
            targetActive && dropTarget.position === 'after' && 'after:absolute after:inset-x-2 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-cyan-300 after:shadow-[0_0_10px_rgba(103,232,249,0.8)]',
          )}
        >
          <span className={cn('z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-black', reveal && !positionCorrect ? 'bg-red-400 text-red-950' : 'bg-cyan-300 text-cyan-950')}>{index + 1}</span>
          <span className="min-w-0 flex-1 text-sm font-semibold text-text-primary">{item.label}</span>
          {!reveal && <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" onClick={() => moveByOffset(id, -1)} disabled={disabled || index === 0} aria-label={t('games.timeline.moveUp', { event: item.label })} className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-cyan-400/10 hover:text-cyan-300 disabled:opacity-25"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" onClick={() => moveByOffset(id, 1)} disabled={disabled || index === order.length - 1} aria-label={t('games.timeline.moveDown', { event: item.label })} className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-cyan-400/10 hover:text-cyan-300 disabled:opacity-25"><ArrowDown className="h-4 w-4" /></button>
            <button type="button" onClick={() => pick(id)} disabled={disabled} aria-label={t('games.timeline.remove', { event: item.label })} className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-red-400/10 hover:text-red-300 disabled:opacity-25"><X className="h-4 w-4" /></button>
            <GripVertical className="ml-0.5 hidden h-4 w-4 cursor-grab text-text-muted sm:block" aria-hidden="true" />
          </div>}
        </div>
      })}
    </div>
    {!reveal && bank.length > 0 && <><p className="mb-2 mt-4 text-2xs font-bold uppercase tracking-[0.12em] text-text-muted">{t('games.timeline.tap')}</p><div className="grid gap-2 sm:grid-cols-2">{bank.map((item) => <button key={item.id} type="button" onClick={() => pick(item.id)} disabled={disabled} className="min-h-12 rounded-xl border border-border-subtle bg-bg-primary px-3 py-2 text-left text-sm font-medium text-text-secondary transition-all hover:-translate-y-0.5 hover:border-cyan-400/40 hover:text-cyan-200 active:scale-[0.98]">{item.label}</button>)}</div></>}
  </div>
}

const MATCH_COLORS = [
  'border-cyan-400/45 bg-cyan-400/10 text-cyan-200',
  'border-violet-400/45 bg-violet-400/10 text-violet-200',
  'border-amber-300/45 bg-amber-300/10 text-amber-200',
  'border-emerald-400/45 bg-emerald-400/10 text-emerald-200',
]

function MatchingAnswer({ question, value, onChange, disabled, reveal }: { question: GameQuestion; value: GameAnswer | null; onChange: (answer: GameAnswer) => void; disabled: boolean; reveal: boolean }) {
  const { t } = useTranslation()
  const leftItems = question.left_items ?? []
  const rightItems = question.right_items ?? []
  const mapping = Array.isArray(value) ? value : Array.from({ length: leftItems.length }, () => -1)
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const connect = (rightIndex: number) => {
    if (disabled) return
    const leftIndex = selectedLeft ?? mapping.findIndex((item) => item < 0)
    if (leftIndex < 0) return
    const next = [...mapping]
    const previousOwner = next.indexOf(rightIndex)
    if (previousOwner >= 0) next[previousOwner] = -1
    next[leftIndex] = rightIndex
    onChange(next)
    const nextEmpty = next.findIndex((item, index) => item < 0 && index > leftIndex)
    setSelectedLeft(nextEmpty >= 0 ? nextEmpty : next.findIndex((item) => item < 0))
  }

  return <div className="mx-auto mt-6 max-w-2xl text-left">
    <p className="mb-3 text-center text-xs text-text-muted">{t('games.matching.hint')}</p>
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
      <div className="space-y-2">{leftItems.map((label, index) => {
        const assigned = mapping[index] ?? -1
        const correctPair = reveal && Array.isArray(question.correct_answer) && question.correct_answer[index] === assigned
        return <button key={label} type="button" onClick={() => !disabled && setSelectedLeft(index)} disabled={disabled} className={cn('relative min-h-16 w-full rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition-all', reveal ? correctPair ? 'border-emerald-400/45 bg-emerald-400/10' : 'border-red-400/40 bg-red-400/[0.07]' : selectedLeft === index ? 'scale-[1.02] border-accent bg-accent/15 shadow-lg shadow-accent/10' : assigned >= 0 ? MATCH_COLORS[index % MATCH_COLORS.length] : 'border-border-subtle bg-bg-primary hover:border-violet-400/35')}><span className="block text-text-primary">{label}</span>{assigned >= 0 && <span className="mt-1 block truncate text-2xs opacity-75">↔ {rightItems[assigned]}</span>}</button>
      })}</div>
      <div className="space-y-2">{rightItems.map((label, rightIndex) => {
        const owner = mapping.indexOf(rightIndex)
        return <button key={label} type="button" onClick={() => connect(rightIndex)} disabled={disabled} className={cn('relative min-h-16 w-full rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition-all active:scale-[0.98]', owner >= 0 ? MATCH_COLORS[owner % MATCH_COLORS.length] : 'border-border-subtle bg-bg-primary text-text-primary hover:-translate-y-0.5 hover:border-violet-400/40')}><span>{label}</span>{owner >= 0 && <span className="float-right flex h-6 w-6 items-center justify-center rounded-full bg-current/15 font-mono text-2xs font-black">{owner + 1}</span>}</button>
      })}</div>
    </div>
  </div>
}

const MEMORY_TONES = [
  'border-cyan-500/40 bg-cyan-500/10',
  'border-violet-500/40 bg-violet-500/10',
  'border-amber-500/40 bg-amber-500/10',
  'border-emerald-500/40 bg-emerald-500/10',
]

function MemoryAnswer({ question, value, onChange, disabled, reveal }: { question: GameQuestion; value: GameAnswer | null; onChange: (answer: GameAnswer) => void; disabled: boolean; reveal: boolean }) {
  const { t } = useTranslation()
  const cards = question.memory_cards ?? []
  const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards])
  const pairCount = useMemo(() => new Set(cards.map((card) => card.pair_id)).size, [cards])
  const [openIds, setOpenIds] = useState<number[]>([])
  const [matchedPairs, setMatchedPairs] = useState<number[]>([])
  const [resolving, setResolving] = useState(false)
  const completed = Array.isArray(value) && value.length === pairCount

  useEffect(() => {
    if (openIds.length !== 2) return
    const first = byId.get(openIds[0])
    const second = byId.get(openIds[1])
    if (!first || !second) return
    const matches = first.pair_id === second.pair_id
    setResolving(true)
    const timeout = window.setTimeout(() => {
      if (matches) {
        setMatchedPairs((current) => {
          const next = current.includes(first.pair_id) ? current : [...current, first.pair_id]
          if (next.length === pairCount) onChange(Array.from({ length: pairCount }, (_, index) => index))
          return next
        })
      }
      setOpenIds([])
      setResolving(false)
    }, matches ? 380 : 720)
    return () => window.clearTimeout(timeout)
  }, [byId, onChange, openIds, pairCount])

  const flip = (id: number) => {
    const card = byId.get(id)
    if (disabled || resolving || !card || openIds.includes(id) || matchedPairs.includes(card.pair_id)) return
    setOpenIds((current) => [...current, id])
  }

  return <div className="mx-auto mt-6 max-w-2xl">
    <div className="mb-3 flex items-center justify-between gap-3 text-xs text-text-muted">
      <span>{t('games.memory.hint')}</span>
      <strong className="rounded-full border border-border-subtle bg-bg-secondary px-3 py-1 font-mono text-text-primary">{matchedPairs.length}/{pairCount}</strong>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {cards.map((card, index) => {
        const matched = completed || matchedPairs.includes(card.pair_id)
        const flipped = reveal || matched || openIds.includes(card.id)
        return <button key={card.id} type="button" onClick={() => flip(card.id)} disabled={disabled || resolving || matched} aria-label={flipped ? card.label : t('games.memory.flipCard', { position: index + 1 })} className={cn('game-memory-card relative aspect-[4/3] min-h-20 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent', flipped && 'is-flipped', matched && 'game-memory-match')}>
          <span className="game-memory-card-inner absolute inset-0 block">
            <span className="game-memory-card-face absolute inset-0 flex items-center justify-center rounded-xl border border-border-strong bg-bg-secondary text-accent shadow-sm">
              <CircleHelp className="h-7 w-7" />
            </span>
            <span className={cn('game-memory-card-face game-memory-card-back absolute inset-0 flex items-center justify-center rounded-xl border px-3 text-center text-xs font-semibold text-text-primary shadow-sm sm:text-sm', MEMORY_TONES[card.pair_id % MEMORY_TONES.length])}>{card.label}</span>
          </span>
        </button>
      })}
    </div>
    {completed && !reveal && <p className="game-soft-pop mt-3 text-center text-sm font-bold text-emerald-300">{t('games.memory.completed')}</p>}
  </div>
}

function MapAnswer({ question, value, onChange, disabled, reveal }: { question: GameQuestion; value: GameAnswer | null; onChange: (answer: GameAnswer) => void; disabled: boolean; reveal: boolean }) {
  const { t } = useTranslation()
  const points = question.map_points ?? []
  const selected = typeof value === 'number' ? value : null

  return <div className="mx-auto mt-6 max-w-xl">
    <p className="mb-3 text-xs text-text-muted">{t('games.map.hint')}</p>
    <div className="relative aspect-[5/4] overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-sky-400/10 via-cyan-400/[0.04] to-emerald-400/10 shadow-xl shadow-emerald-500/5">
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(110,231,183,.13) 1px, transparent 1px), linear-gradient(90deg, rgba(110,231,183,.13) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-emerald-300/15" aria-hidden="true">
        <path d="M39 8 C52 10 65 15 67 25 C70 35 61 39 66 48 C73 59 66 73 58 88 C53 96 41 94 36 83 C31 72 37 62 33 52 C28 40 31 26 39 8Z" fill="currentColor" stroke="rgba(110,231,183,.32)" strokeWidth="1.2" />
        <path d="M61 16 C66 20 68 27 66 35 C63 39 58 38 55 34 C54 27 56 21 61 16Z" fill="rgba(56,189,248,.15)" stroke="rgba(125,211,252,.35)" strokeWidth=".8" />
        <path d="M62 48 C68 51 71 59 68 68 C65 72 61 68 60 62 C58 57 59 52 62 48Z" fill="rgba(56,189,248,.12)" />
      </svg>
      <span className="absolute left-4 top-4 rounded-full border border-emerald-300/20 bg-bg-primary/70 px-3 py-1 text-2xs font-bold uppercase tracking-[0.14em] text-emerald-200 backdrop-blur">{t('games.map.region')}</span>
      {points.map((point) => {
        const isSelected = selected === point.id
        const isCorrect = reveal && question.correct_answer === point.id
        const isWrong = reveal && isSelected && !isCorrect
        return <button key={point.id} type="button" onClick={() => !disabled && onChange(point.id)} disabled={disabled} aria-label={point.label} style={{ left: `${point.x}%`, top: `${point.y}%` }} className={cn('game-map-pin group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-transform hover:z-20 hover:scale-110 focus-visible:z-20 focus-visible:outline-none', isSelected && 'z-20 scale-110')}>
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-lg backdrop-blur transition-colors', isCorrect ? 'border-emerald-200 bg-emerald-400 text-emerald-950 shadow-emerald-400/30' : isWrong ? 'border-red-200 bg-red-400 text-red-950 shadow-red-400/30' : isSelected ? 'border-amber-200 bg-amber-300 text-amber-950 shadow-amber-300/30' : 'border-emerald-300/40 bg-bg-primary/85 text-emerald-200 shadow-black/20 group-hover:border-emerald-200')}><MapPin className="h-4 w-4 fill-current" /></span>
          <span className={cn('mt-1 whitespace-nowrap rounded-md border bg-bg-primary/85 px-1.5 py-0.5 text-[9px] font-bold shadow-sm backdrop-blur sm:text-2xs', isCorrect ? 'border-emerald-300/40 text-emerald-200' : isWrong ? 'border-red-300/40 text-red-200' : isSelected ? 'border-amber-300/40 text-amber-200' : 'border-border-subtle text-text-secondary')}>{point.label}</span>
        </button>
      })}
    </div>
  </div>
}

function TimerDial({ remaining, total }: { remaining: number; total: number }) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? remaining / total : 0
  const urgent = remaining <= 7
  return (
    <div className={cn('relative flex h-12 w-12 items-center justify-center rounded-full bg-bg-primary shadow-inner', urgent && 'game-timer-urgent')} aria-label={`${remaining}s`}>
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-border-subtle" />
        <circle cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} className={cn('transition-all duration-500', urgent ? 'text-red-400' : 'text-accent')} />
      </svg>
      <span className={cn('relative font-mono text-sm font-black tabular-nums', urgent ? 'text-red-400' : 'text-text-primary')}>{remaining}</span>
    </div>
  )
}

function RevealFeedback({ correct, timedOut, points, correctAnswer }: { correct: boolean; timedOut: boolean; points: number; correctAnswer: string }) {
  const { t } = useTranslation()
  if (correct) {
    return <div className="game-reveal-win mx-auto mt-6 flex max-w-2xl items-center gap-4 overflow-hidden rounded-2xl border border-emerald-400/40 bg-gradient-to-r from-emerald-400/20 via-emerald-400/10 to-amber-300/10 px-5 py-4 text-left shadow-xl shadow-emerald-500/10"><span className="game-badge-pop flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-400/25"><PartyPopper className="h-6 w-6" /></span><span className="min-w-0 flex-1"><strong className="block text-xl font-black text-emerald-300">{t('games.correct')}</strong><span className="text-xs text-emerald-100/70">{t('games.greatAnswer')}</span></span><strong className="game-score-pop whitespace-nowrap font-mono text-xl font-black text-amber-300">+{points}</strong></div>
  }
  return <div className="game-reveal-lose mx-auto mt-6 flex max-w-2xl items-center gap-4 rounded-2xl border border-red-400/25 bg-red-400/[0.07] px-5 py-4 text-left"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-400/15 text-red-300">{timedOut ? <Flame className="h-6 w-6" /> : <X className="h-6 w-6" />}</span><span><strong className="block text-lg font-bold text-text-primary">{timedOut ? t('games.timeUp') : t('games.almost')}</strong><span className="text-xs text-text-muted">{t('games.correctWas', { answer: correctAnswer })}</span></span></div>
}

const CONFETTI_COLORS = ['#f4c95d', '#7dd3fc', '#6ee7b7', '#c4b5fd', '#fb7185']

function GameConfetti({ compact = false }: { compact?: boolean }) {
  const pieces = compact ? 22 : 42
  return <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden="true">{Array.from({ length: pieces }, (_, index) => <span key={index} className="game-confetti-piece" style={{ left: `${(index * 37) % 100}%`, backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length], animationDelay: `${(index % 9) * 70}ms`, animationDuration: `${1100 + (index % 6) * 120}ms` }} />)}</div>
}

function BibleReferenceLink({ reference }: { reference: string }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const workspacePane = useWorkspacePane()
  const openTab = useWorkspaceStore((state) => state.openTab)
  const activateGroup = useWorkspaceStore((state) => state.activateGroup)
  const segments = segmentText(reference)
  if (!segments.some((segment) => segment.kind === 'ref')) return <p className="mt-2 text-xs font-semibold text-accent">{reference}</p>
  const locale = i18n.resolvedLanguage?.startsWith('es') ? 'es' : 'en'
  const openPassage = (parsed: Extract<Segment, { kind: 'ref' }>) => {
    const path = paths.bible({ lang: locale, book: parsed.slug, chapter: parsed.chapter, verse: parsed.verse, endVerse: parsed.endVerse })
    if (workspacePane) activateGroup(workspacePane.groupId)
    const tab = createWorkspaceTab(path, path, parsed.raw)
    tab.id = `bible:${parsed.slug}:${parsed.chapter}:${parsed.verse ?? 1}:${Date.now()}`
    openTab(tab, useWorkspaceStore.getState().activeGroupId)
    navigate(path)
  }

  return (
    <p className="mt-2 text-xs font-semibold">
      {segments.map((segment, index) => segment.kind === 'text'
        ? <span key={index} className="text-text-muted">{segment.value}</span>
        : <button key={index} type="button" onClick={() => openPassage(segment)} aria-label={t('games.openPassage', { reference: segment.raw })} className="inline-flex items-center gap-1 text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:text-accent-hover hover:decoration-current">
            {segment.raw}<PanelsTopLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>)}
    </p>
  )
}

function Results({ room, isHost, busy, onReplay, onBack }: { room: GameRoom; isHost: boolean; busy: boolean; onReplay: () => void; onBack: () => void }) {
  const { t } = useTranslation()
  const ranking = useMemo(() => [...room.players].sort((a, b) => b.score - a.score), [room.players])
  const winner = ranking[0]
  return <div className="relative min-h-full overflow-hidden px-4 py-8 text-center md:py-12">
    <GameConfetti />
    <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl" />
    <div className="game-results-enter relative mx-auto w-full max-w-3xl">
      <div className="game-winner-crown relative mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] border border-amber-300/30 bg-gradient-to-br from-amber-300/25 via-accent/15 to-violet-500/15 text-amber-300 shadow-2xl shadow-amber-300/15"><Trophy className="h-12 w-12" /><PartyPopper className="absolute -right-2 -top-2 h-6 w-6 text-accent" /></div>
      <p className="mt-5 text-2xs font-bold uppercase tracking-[0.2em] text-amber-300">{t('games.champion')}</p>
      <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-text-primary md:text-5xl">{winner ? t('games.winner', { name: winner.name }) : t('games.results')}</h1>
      {winner && <div className="mx-auto mt-4 inline-flex items-center gap-3 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2"><UserAvatar name={winner.name} email={winner.email} src={winner.avatar_url} size="lg" /><strong className="font-mono text-lg font-black text-amber-300">{winner.score} pts</strong></div>}

      <div className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">{ranking.slice(0, 3).map((player, index) => <div key={player.id} className={cn('game-podium-card relative overflow-hidden rounded-2xl border p-4 text-center shadow-lg', index === 0 ? 'border-amber-300/35 bg-gradient-to-b from-amber-300/15 to-bg-secondary sm:-translate-y-3' : index === 1 ? 'border-slate-300/25 bg-gradient-to-b from-slate-300/10 to-bg-secondary' : 'border-orange-400/20 bg-gradient-to-b from-orange-400/10 to-bg-secondary')} style={{ animationDelay: `${index * 120}ms` }}><span className={cn('mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-xl', index === 0 ? 'bg-amber-300 text-amber-950' : index === 1 ? 'bg-slate-300 text-slate-900' : 'bg-orange-400 text-orange-950')}>{index === 0 ? <Crown className="h-5 w-5" /> : <Medal className="h-5 w-5" />}</span><div className="mx-auto w-fit"><UserAvatar name={player.name} email={player.email} src={player.avatar_url} size="xl" /></div><strong className="mt-2 block truncate text-sm text-text-primary">{player.name}</strong><span className="mt-1 block font-mono text-lg font-black text-accent">{player.score}</span></div>)}</div>
      {ranking.length > 3 && <div className="mx-auto mt-4 max-w-2xl space-y-2 text-left">{ranking.slice(3).map((player, index) => <div key={player.id} className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-secondary/80 px-4 py-3"><span className="w-6 text-center font-mono text-sm font-bold text-text-muted">{index + 4}</span><UserAvatar name={player.name} email={player.email} src={player.avatar_url} size="lg" /><span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{player.name}</span><strong className="font-mono text-sm tabular-nums text-text-secondary">{player.score}</strong></div>)}</div>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {isHost && <button type="button" onClick={onReplay} disabled={busy} className="game-cta-shine inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-amber-300 px-7 text-sm font-bold text-bg-primary shadow-xl shadow-accent/15 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}{t('games.playAgain')}</button>}
        <button type="button" onClick={onBack} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-bg-secondary px-6 text-sm font-semibold text-text-secondary transition-colors hover:border-accent/30 hover:text-text-primary"><Gamepad2 className="h-4 w-4" />{t('games.backToGames')}</button>
      </div>
    </div>
  </div>
}
