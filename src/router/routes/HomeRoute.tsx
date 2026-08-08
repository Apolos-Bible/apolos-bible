import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, CalendarDays, CheckCircle2, ChevronRight, MessageCircle, Target, Users } from 'lucide-react'
import { AppPageLayout } from '@/components/layout/AppPageLayout'
import { IntentOnboarding } from '@/components/onboarding/IntentOnboarding'
import { productApi, type HomePayload } from '@/lib/productApi'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { paths } from '@/router/paths'

export function HomeRoute() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const openAuth = useUIStore((state) => state.openAuthModal)
  const [data, setData] = useState<HomePayload | null>(null)
  const [error, setError] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => !!user && !user.tutorial_completed)
  const [showGoal, setShowGoal] = useState(false)
  const [goalTarget, setGoalTarget] = useState(1)
  const [calendar, setCalendar] = useState<Array<{ date: string; completed: boolean }>>([])

  useEffect(() => { if (!user) { openAuth(); return } productApi.home().then(setData).catch(() => setError(true)) }, [user, openAuth])
  useEffect(() => { if (data) setGoalTarget(data.daily_goal.target) }, [data])
  const openGoal = async () => { setShowGoal(true); const month = new Date().toISOString().slice(0, 7); productApi.calendar(month).then((value) => setCalendar(value.days)).catch(() => setCalendar([])) }
  const saveGoal = async () => { if (!data) return; const updated = await productApi.goal({ kind: 'chapters', target: goalTarget, active_days: [0,1,2,3,4,5,6], timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, share_completions: data.daily_goal.share_completions }); setData({ ...data, daily_goal: updated }); setShowGoal(false) }
  if (!user) return <AppPageLayout title="Inicio"><div className="p-6 text-sm text-text-muted">Inicia sesión para ver tu inicio personal.</div></AppPageLayout>

  const reading = data?.last_reading
  const openReading = () => reading?.book_slug && navigate(paths.bible({ lang: 'es', book: reading.book_slug, chapter: reading.chapter, verse: reading.verse }))
  return <AppPageLayout title="Inicio">
    {showOnboarding && <IntentOnboarding onFinish={() => setShowOnboarding(false)} />}
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">
      <header><p className="text-sm text-text-muted">Tu espacio diario</p><h1 className="mt-1 text-2xl font-semibold text-text-primary">Hola, {user.name.split(' ')[0]}</h1></header>
      {error && <div role="alert" className="mt-5 rounded-lg border border-border-subtle bg-bg-secondary p-4 text-sm text-text-muted">No pudimos actualizar el inicio. Comprueba tu conexión e inténtalo de nuevo.</div>}
      {!data && !error ? <div role="status" className="mt-8 text-sm text-text-muted">Preparando tu día…</div> : data && <>
        <section className="mt-6 grid gap-3 md:grid-cols-3">
          <button onClick={openReading} disabled={!reading} className="col-span-2 flex min-h-36 flex-col items-start justify-between rounded-xl border border-border-subtle bg-bg-secondary p-5 text-left transition-colors hover:bg-bg-tertiary disabled:opacity-60"><BookOpen className="h-5 w-5 text-accent"/><div><p className="text-xs text-text-muted">Continuar leyendo</p><h2 className="mt-1 text-lg font-semibold text-text-primary">{reading ? `${reading.book_name ?? reading.book_slug} ${reading.chapter}:${reading.verse}` : 'Empieza una lectura'}</h2></div><span className="flex items-center gap-1 text-xs text-accent">Abrir lector <ChevronRight className="h-3.5 w-3.5" /></span></button>
          <button onClick={() => void openGoal()} className="flex min-h-36 flex-col justify-between rounded-xl border border-border-subtle bg-bg-secondary p-5 text-left hover:bg-bg-tertiary"><Target className="h-5 w-5 text-accent"/><div className="w-full"><p className="text-xs text-text-muted">Meta de hoy</p><p className="mt-1 text-2xl font-semibold text-text-primary">{data.daily_goal.progress}/{data.daily_goal.target}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-tertiary"><div className="h-full bg-accent" style={{ width: `${Math.min(100, data.daily_goal.progress / data.daily_goal.target * 100)}%` }} /></div><p className="mt-2 text-xs text-text-muted">Racha: {data.daily_goal.streak} días · Ver calendario</p></div></button>
        </section>
        <section className="mt-3 grid gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-border-subtle bg-bg-secondary p-5"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-accent"/><h2 className="text-sm font-semibold text-text-primary">Tu camino</h2></div>{data.active_plan ? <button onClick={() => navigate(paths.marketplacePath(data.active_plan!.path_slug || data.active_plan!.slug))} className="mt-4 flex w-full items-center justify-between text-left"><span><strong className="block text-sm text-text-primary">{data.active_plan.title}</strong><span className="text-xs text-text-muted">Continuar por el paso {data.active_plan.current_step + 1}</span></span><ChevronRight className="h-4 w-4 text-text-muted"/></button> : <button onClick={() => navigate(paths.marketplace())} className="mt-4 text-sm text-accent">Explorar un plan</button>}</article>
          <article className="rounded-xl border border-border-subtle bg-bg-secondary p-5"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-accent"/><h2 className="text-sm font-semibold text-text-primary">Tu círculo</h2></div><div className="mt-3 space-y-3">{data.social_activity.length ? data.social_activity.slice(0, 3).map((item) => <button key={item.id} onClick={() => item.target.book && navigate(paths.bible({ lang: 'es', book: item.target.book, chapter: item.target.chapter || 1, verse: item.target.verse }))} className="block w-full border-b border-border-subtle pb-3 text-left last:border-0"><strong className="text-xs text-text-primary">{item.actor.name}</strong><p className="mt-1 line-clamp-2 text-xs text-text-muted">{item.summary}</p></button>) : <p className="text-xs text-text-muted">Cuando tus amigos compartan reflexiones aparecerán aquí.</p>}</div></article>
        </section>
        <section className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">{[
          [BookOpen, 'Leer', openReading], [CheckCircle2, 'Planes', () => navigate(paths.marketplace())], [MessageCircle, 'Conversaciones', () => navigate('/chat/0')], [Users, 'Mi perfil', () => navigate(paths.profile())],
        ].map(([Icon, label, action]) => { const ActionIcon = Icon as typeof BookOpen; return <button key={label as string} onClick={action as () => void} className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-secondary p-3 text-sm text-text-secondary hover:bg-bg-tertiary"><ActionIcon className="h-4 w-4 text-accent" />{label as string}</button> })}</section>
      </>}
      {showGoal && <div className="fixed inset-0 z-[65] flex items-center justify-center bg-bg-primary/80 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowGoal(false) }}><section role="dialog" aria-modal="true" aria-label="Configurar meta diaria" className="w-full max-w-md rounded-xl border border-border-subtle bg-bg-secondary p-5"><h2 className="text-lg font-semibold text-text-primary">Meta diaria</h2><label className="mt-4 block text-xs text-text-muted">Capítulos al día<input type="number" min={1} max={20} value={goalTarget} onChange={(event) => setGoalTarget(Number(event.target.value))} className="mt-1 block w-full rounded-md border border-border-subtle bg-bg-primary p-2 text-sm text-text-primary" /></label><div className="mt-5 grid grid-cols-7 gap-1">{Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }, (_, index) => { const day = index + 1; const record = calendar.find((entry) => Number(entry.date.slice(-2)) === day); return <span key={day} title={record?.date} className={`flex aspect-square items-center justify-center rounded text-2xs ${record?.completed ? 'bg-accent text-bg-primary' : 'bg-bg-tertiary text-text-muted'}`}>{day}</span> })}</div><div className="mt-5 flex justify-end gap-2"><button onClick={() => setShowGoal(false)} className="px-3 py-2 text-sm text-text-muted">Cancelar</button><button onClick={() => void saveGoal()} className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-primary">Guardar</button></div></section></div>}
    </main>
  </AppPageLayout>
}
