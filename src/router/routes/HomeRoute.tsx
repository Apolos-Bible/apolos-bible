import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, ChevronRight, Flame, MessageCircle, Sparkles, Target, Users } from 'lucide-react'
import { AppPageLayout } from '@/components/layout/AppPageLayout'
import { IntentOnboarding } from '@/components/onboarding/IntentOnboarding'
import { productApi, type HomePayload } from '@/lib/productApi'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { paths } from '@/router/paths'

export function HomeRoute() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const authLoading = useAuthStore((state) => state.loading)
  const openAuth = useUIStore((state) => state.openAuthModal)
  const [data, setData] = useState<HomePayload | null>(null)
  const [error, setError] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => user?.tutorial_completed === false)
  const [showGoal, setShowGoal] = useState(false)
  const [goalTarget, setGoalTarget] = useState(1)
  const [calendar, setCalendar] = useState<Array<{ date: string; completed: boolean }>>([])

  useEffect(() => { if (authLoading) return; if (!user) { openAuth(); return } productApi.home().then(setData).catch(() => setError(true)) }, [user, authLoading, openAuth])
  useEffect(() => { if (user?.tutorial_completed === false) setShowOnboarding(true) }, [user])
  useEffect(() => { if (data) setGoalTarget(data.daily_goal.target) }, [data])
  useEffect(() => { if (!user) return; const month = new Date().toISOString().slice(0, 7); productApi.calendar(month).then((value) => setCalendar(value.days)).catch(() => setCalendar([])) }, [user])
  const openGoal = () => setShowGoal(true)
  const saveGoal = async () => { if (!data) return; const updated = await productApi.goal({ kind: 'chapters', target: goalTarget, active_days: [0,1,2,3,4,5,6], timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, share_completions: data.daily_goal.share_completions }); setData({ ...data, daily_goal: updated }); setShowGoal(false) }
  if (authLoading) return <AppPageLayout title="Inicio"><div role="status" className="p-6 text-sm text-text-muted">Cargando tu inicio…</div></AppPageLayout>
  if (!user) return <AppPageLayout title="Inicio"><div className="p-6 text-sm text-text-muted">Inicia sesión para ver tu inicio personal.</div></AppPageLayout>

  const reading = data?.last_reading
  const openReading = () => reading?.book_slug && navigate(paths.bible({ lang: 'es', book: reading.book_slug, chapter: reading.chapter, verse: reading.verse }))
  return <AppPageLayout title="Inicio">
    {showOnboarding && <IntentOnboarding onFinish={() => setShowOnboarding(false)} />}
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">
      <header className="flex items-end justify-between gap-4"><div><p className="text-2xs font-semibold uppercase tracking-[0.16em] text-accent">Tu espacio diario</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-text-primary md:text-3xl">Hola, {user.name.split(' ')[0]}</h1><p className="mt-1 text-sm text-text-muted">Un momento para leer, pensar y compartir.</p></div><div className="hidden items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary px-3 py-2 text-xs text-text-muted sm:flex"><Flame className="h-4 w-4 text-accent"/><strong className="text-text-primary">{data?.daily_goal.streak ?? 0}</strong> días</div></header>
      {error && <div role="alert" className="mt-5 rounded-lg border border-border-subtle bg-bg-secondary p-4 text-sm text-text-muted">No pudimos actualizar el inicio. Comprueba tu conexión e inténtalo de nuevo.</div>}
      {!data && !error ? <div role="status" className="mt-8 text-sm text-text-muted">Preparando tu día…</div> : data && <>
        <section className="relative mt-6 overflow-hidden rounded-2xl border border-border-subtle bg-bg-secondary">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/[0.09] blur-3xl" />
          <div className="relative grid min-h-[260px] md:grid-cols-[minmax(0,1fr)_240px]">
            <button onClick={openReading} disabled={!reading} className="group flex flex-col items-start justify-between p-6 text-left md:p-8 disabled:opacity-60">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent"><Sparkles className="h-3.5 w-3.5"/> Continúa donde lo dejaste</span>
              <div className="my-8"><p className="text-sm text-text-muted">Tu lectura</p><h2 className="mt-2 font-reading text-3xl leading-tight text-text-primary md:text-4xl">{reading ? `${reading.book_name ?? reading.book_slug} ${reading.chapter}:${reading.verse}` : 'Empieza hoy por Génesis'}</h2>{reading?.version && <p className="mt-2 text-xs uppercase tracking-wider text-text-muted">{reading.version}</p>}</div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent">Abrir la Biblia <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </button>
            <button onClick={() => void openGoal()} className="flex flex-col items-center justify-center border-t border-border-subtle bg-bg-primary/30 p-6 text-center hover:bg-bg-tertiary/50 md:border-l md:border-t-0">
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--accent) ${Math.min(100, data.daily_goal.progress / data.daily_goal.target * 100)}%, var(--bg-tertiary) 0)` }}><div className="flex h-[102px] w-[102px] flex-col items-center justify-center rounded-full bg-bg-secondary"><strong className="text-2xl font-semibold text-text-primary">{data.daily_goal.progress}<span className="text-sm text-text-muted">/{data.daily_goal.target}</span></strong><span className="mt-1 text-2xs uppercase tracking-wider text-text-muted">capítulos</span></div></div>
              <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-text-primary"><Target className="h-4 w-4 text-accent"/> Meta de hoy</p><p className="mt-1 text-xs text-text-muted">Pulsa para ver tu calendario</p>
            </button>
          </div>
        </section>
        <section className="mt-4 rounded-xl border border-border-subtle bg-bg-secondary p-5">
          <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10"><CalendarDays className="h-4 w-4 text-accent" /></span><div><h2 className="text-sm font-semibold text-text-primary">Tu constancia</h2><p className="mt-0.5 text-2xs text-text-muted">{new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(new Date())}</p></div></div><button onClick={openGoal} className="text-xs text-accent hover:underline">Configurar meta</button></div>
          <div className="mt-5 grid grid-cols-7 gap-1.5"><>{['L','M','X','J','V','S','D'].map((label, index) => <span key={`${label}-${index}`} className="pb-1 text-center text-2xs font-medium text-text-muted">{label}</span>)}</>{Array.from({ length: (new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() + 6) % 7 }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }, (_, index) => { const day = index + 1; const today = day === new Date().getDate(); const record = calendar.find((entry) => Number(entry.date.slice(-2)) === day); return <span key={day} title={record?.completed ? `Meta completada el día ${day}` : `Día ${day}`} className={`flex h-8 items-center justify-center rounded-md text-xs transition-colors ${record?.completed ? 'bg-accent text-bg-primary font-semibold' : today ? 'border border-accent/50 bg-accent/5 text-accent font-semibold' : 'bg-bg-primary/50 text-text-muted'}`}>{day}</span> })}</div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3"><p className="flex items-center gap-1.5 text-xs text-text-muted"><Flame className="h-3.5 w-3.5 text-accent"/><strong className="text-text-primary">{data.daily_goal.streak} días</strong> de racha actual</p><p className="text-2xs text-text-muted"><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-accent"/>Meta completada</p></div>
        </section>
        <section className="mt-4 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-xl border border-border-subtle bg-bg-secondary p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10"><CalendarDays className="h-4 w-4 text-accent"/></span><div><h2 className="text-sm font-semibold text-text-primary">Tu camino</h2><p className="text-2xs text-text-muted">Sigue creciendo paso a paso</p></div></div></div>{data.active_plan ? <button onClick={() => navigate(paths.marketplacePath(data.active_plan!.path_slug || data.active_plan!.slug))} className="group mt-5 flex w-full items-center justify-between rounded-lg bg-bg-primary px-4 py-4 text-left hover:bg-bg-tertiary"><span><strong className="block text-sm text-text-primary">{data.active_plan.title}</strong><span className="mt-1 block text-xs text-text-muted">Paso {data.active_plan.current_step + 1} listo para continuar</span></span><ChevronRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-1"/></button> : <button onClick={() => navigate(paths.marketplace())} className="group mt-5 flex w-full items-center justify-between rounded-lg bg-bg-primary px-4 py-4 text-left"><span><strong className="block text-sm text-text-primary">Encuentra tu primera ruta</strong><span className="mt-1 block text-xs text-text-muted">Planes guiados para cada etapa</span></span><ChevronRight className="h-4 w-4 text-accent"/></button>}</article>
          <article className="rounded-xl border border-border-subtle bg-bg-secondary p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10"><Users className="h-4 w-4 text-accent"/></span><div><h2 className="text-sm font-semibold text-text-primary">Tu círculo</h2><p className="text-2xs text-text-muted">Reflexiones de tus amigos</p></div></div>{data.social_activity.length > 0 && <button onClick={() => navigate(paths.feed())} className="text-xs text-accent">Ver todo</button>}</div><div className="mt-4 space-y-1">{data.social_activity.length ? data.social_activity.slice(0, 3).map((item) => <button key={item.id} onClick={() => item.target.book && navigate(paths.bible({ lang: 'es', book: item.target.book, chapter: item.target.chapter || 1, verse: item.target.verse }))} className="group flex w-full gap-3 rounded-lg p-2 text-left hover:bg-bg-tertiary"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">{item.actor.name.charAt(0)}</span><span className="min-w-0"><strong className="text-xs text-text-primary">{item.actor.name}</strong><span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-text-muted">{item.summary}</span></span></button>) : <div className="flex min-h-24 flex-col items-center justify-center text-center"><Users className="h-5 w-5 text-text-muted"/><p className="mt-2 max-w-xs text-xs text-text-muted">Las reflexiones que compartan tus amigos aparecerán aquí.</p></div>}</div></article>
        </section>
        <section className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">{[
          [BookOpen, 'Leer', openReading], [CheckCircle2, 'Planes', () => navigate(paths.marketplace())], [MessageCircle, 'Conversaciones', () => navigate('/chat/0')], [Users, 'Mi perfil', () => navigate(paths.profile())],
        ].map(([Icon, label, action]) => { const ActionIcon = Icon as typeof BookOpen; return <button key={label as string} onClick={action as () => void} className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-secondary p-3 text-sm text-text-secondary hover:bg-bg-tertiary"><ActionIcon className="h-4 w-4 text-accent" />{label as string}</button> })}</section>
      </>}
      {showGoal && <div className="fixed inset-0 z-[65] flex items-center justify-center bg-bg-primary/80 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowGoal(false) }}><section role="dialog" aria-modal="true" aria-label="Configurar meta diaria" className="w-full max-w-md rounded-xl border border-border-subtle bg-bg-secondary p-5"><h2 className="text-lg font-semibold text-text-primary">Meta diaria</h2><p className="mt-1 text-xs text-text-muted">Elige un objetivo sostenible. El progreso se actualiza al avanzar por capítulos distintos.</p><label className="mt-5 block text-xs text-text-muted">Capítulos al día<input type="number" min={1} max={20} value={goalTarget} onChange={(event) => setGoalTarget(Number(event.target.value))} className="mt-1 block w-full rounded-md border border-border-subtle bg-bg-primary p-2 text-sm text-text-primary" /></label><div className="mt-5 flex justify-end gap-2"><button onClick={() => setShowGoal(false)} className="px-3 py-2 text-sm text-text-muted">Cancelar</button><button onClick={() => void saveGoal()} className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-primary">Guardar</button></div></section></div>}
    </main>
  </AppPageLayout>
}
