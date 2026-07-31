import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Brain, CircleHelp, Clock3, Gamepad2, Grid2X2, Link2, ListOrdered, MapPinned, Quote, UsersRound } from 'lucide-react'
import { AppPageLayout } from '@/components/layout/AppPageLayout'
import { gameApi, type GameRoomSummary } from '@/lib/gameApi'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { paths } from '@/router/paths'
import { cn } from '@/lib/cn'

const GAME_CARDS = [
  { type: 'trivia', icon: Brain, label: 'games.type.trivia', hint: 'games.type.triviaHint', tone: 'from-cyan-400/15 to-blue-500/5 text-cyan-300 border-cyan-400/20' },
  { type: 'who', icon: UsersRound, label: 'games.type.who', hint: 'games.type.whoHint', tone: 'from-violet-400/15 to-fuchsia-500/5 text-violet-300 border-violet-400/20' },
  { type: 'myth', icon: CircleHelp, label: 'games.type.myth', hint: 'games.type.mythHint', tone: 'from-amber-300/15 to-orange-500/5 text-amber-300 border-amber-300/20' },
  { type: 'fill', icon: Quote, label: 'games.type.fill', hint: 'games.type.fillHint', tone: 'from-emerald-400/15 to-teal-500/5 text-emerald-300 border-emerald-400/20' },
  { type: 'timeline', icon: ListOrdered, label: 'games.type.timeline', hint: 'games.type.timelineHint', tone: 'from-sky-400/15 to-cyan-500/5 text-sky-300 border-sky-400/20' },
  { type: 'matching', icon: Link2, label: 'games.type.matching', hint: 'games.type.matchingHint', tone: 'from-pink-400/15 to-rose-500/5 text-pink-300 border-pink-400/20' },
  { type: 'memory', icon: Grid2X2, label: 'games.type.memory', hint: 'games.type.memoryHint', tone: 'from-violet-400/15 to-indigo-500/5 text-violet-300 border-violet-400/20' },
  { type: 'map', icon: MapPinned, label: 'games.type.map', hint: 'games.type.mapHint', tone: 'from-emerald-400/15 to-cyan-500/5 text-emerald-300 border-emerald-400/20' },
] as const

export function GamesRoute() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const authLoading = useAuthStore((state) => state.loading)
  const openAuthModal = useUIStore((state) => state.openAuthModal)
  const addToast = useUIStore((state) => state.addToast)
  const [rooms, setRooms] = useState<GameRoomSummary[]>([])
  const [invitations, setInvitations] = useState<GameRoomSummary[]>([])
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      openAuthModal()
      navigate(paths.root(), { replace: true })
      return
    }
    void gameApi.index().then((data) => {
      setRooms(data.rooms)
      setInvitations(data.invitations)
    }).catch(() => addToast(t('games.error'), 'error'))
  }, [authLoading, user, openAuthModal, navigate, addToast, t])

  const createRoom = async () => {
    setBusy(true)
    try {
      const room = await gameApi.create(i18n.language.startsWith('en') ? 'en' : 'es')
      navigate(paths.gameRoom(room.id))
    } catch {
      addToast(t('games.error'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const joinRoom = async () => {
    if (code.length !== 6) return
    setBusy(true)
    try {
      const room = await gameApi.join(code)
      navigate(paths.gameRoom(room.id))
    } catch {
      addToast(t('games.codeError'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const accept = async (roomId: string) => {
    setBusy(true)
    try {
      const room = await gameApi.accept(roomId)
      navigate(paths.gameRoom(room.id))
    } catch {
      addToast(t('games.error'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppPageLayout title={t('games.title')}>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
        <header className="game-round-enter relative overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/[0.13] via-bg-secondary to-violet-500/[0.08] px-5 py-8 shadow-2xl shadow-accent/5 md:px-9 md:py-11">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
          <div className="game-float pointer-events-none absolute right-12 top-8 hidden h-24 w-24 rotate-6 rounded-3xl border border-accent/20 bg-bg-primary/50 shadow-2xl backdrop-blur md:flex md:items-center md:justify-center"><Gamepad2 className="h-11 w-11 text-accent" /></div>
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-2xs font-semibold uppercase tracking-[0.14em] text-accent">
              <Gamepad2 className="h-3.5 w-3.5" /> {t('games.eyebrow')}
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.035em] text-text-primary md:text-5xl">{t('games.hero')}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary md:text-base">{t('games.subtitle')}</p>
            <button type="button" onClick={() => void createRoom()} disabled={busy} className="game-cta-shine mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-amber-300 px-6 text-sm font-bold text-bg-primary shadow-xl shadow-accent/20 transition-transform hover:-translate-y-0.5 disabled:opacity-50">
              <Gamepad2 className="h-4 w-4" /> {t('games.create')}
            </button>
          </div>
        </header>

        <section className="mt-6 grid gap-3 md:grid-cols-3">
          {GAME_CARDS.map(({ type, icon: Icon, label, hint, tone }, index) => (
            <article key={type} className={cn('game-podium-card group rounded-2xl border bg-gradient-to-br p-5 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl', tone)} style={{ animationDelay: `${index * 90}ms` }}>
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-current/15 bg-current/10 transition-transform duration-200 group-hover:-translate-y-1 group-hover:rotate-3"><Icon className="h-5 w-5" /></span>
                <span className="text-2xs font-semibold tabular-nums text-text-muted">0{index + 1}</span>
              </div>
              <h2 className="mt-4 text-base font-semibold text-text-primary">{t(label)}</h2>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">{t(hint)}</p>
            </article>
          ))}
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-border-subtle bg-bg-secondary p-4 md:p-5">
            <h2 className="text-sm font-semibold text-text-primary">{t('games.join')}</h2>
            <p className="mt-1 text-xs text-text-muted">{t('games.joinHint')}</p>
            <div className="mt-4 flex gap-2">
              <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} onKeyDown={(event) => { if (event.key === 'Enter') void joinRoom() }} placeholder="ABC123" aria-label={t('games.code')} className="h-11 min-w-0 flex-1 rounded-xl border border-border-subtle bg-bg-primary px-4 text-center font-mono text-lg font-semibold uppercase tracking-[0.25em] text-text-primary outline-none focus:border-accent" />
              <button type="button" onClick={() => void joinRoom()} disabled={busy || code.length !== 6} className="rounded-xl border border-accent bg-accent/10 px-4 text-sm font-semibold text-accent disabled:opacity-40">{t('games.enter')}</button>
            </div>
          </section>

          <section className="rounded-2xl border border-border-subtle bg-bg-secondary p-4 md:p-5">
            <h2 className="text-sm font-semibold text-text-primary">{t('games.invitations')}</h2>
            <div className="mt-3 space-y-2">
              {invitations.length === 0 && <p className="py-3 text-xs text-text-muted">{t('games.noInvitations')}</p>}
              {invitations.map((room) => <RoomRow key={room.id} room={room} action={t('games.accept')} onClick={() => void accept(room.id)} />)}
            </div>
          </section>
        </div>

        {rooms.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">{t('games.activeRooms')}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {rooms.map((room) => <RoomRow key={room.id} room={room} action={t('games.open')} onClick={() => navigate(paths.gameRoom(room.id))} />)}
            </div>
          </section>
        )}
      </div>
    </AppPageLayout>
  )
}

function RoomRow({ room, action, onClick }: { room: GameRoomSummary; action: string; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-primary px-3 py-3">
      <span className={cn('h-2.5 w-2.5 rounded-full', room.status === 'playing' ? 'bg-accent animate-pulse' : 'bg-text-muted/40')} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{t('games.hostedBy', { name: room.host.name })}</p>
        <p className="mt-0.5 flex items-center gap-2 text-2xs text-text-muted"><UsersRound className="h-3 w-3" />{room.players_count} · <Clock3 className="h-3 w-3" />{room.code}</p>
      </div>
      <button type="button" onClick={onClick} className="rounded-lg bg-accent/10 px-3 py-2 text-xs font-semibold text-accent">{action}</button>
    </div>
  )
}
