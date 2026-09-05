import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Sparkles, X, RotateCcw, ArrowUp, ArrowRight, ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { askAppHelp, helpScreen, type HelpTurn } from '@/lib/appHelp'
import { paths } from '@/router/paths'
import { useCommand } from '@/lib/keyboard'
import { useIsMobile } from '@/lib/useIsMobile'

export function AppAssistant() {
  const userId = useAuthStore(s => s.user?.id)
  // Changing account discards the conversation and aborts any outstanding request.
  return <AssistantSession key={userId ?? 'guest'} />
}

function AssistantSession() {
  const { t } = useTranslation()
  const location = useLocation()
  const locale = useUIStore(s => s.locale)
  const user = useAuthStore(s => s.user)
  const openAuthModal = useUIStore(s => s.openAuthModal)
  const open = useUIStore(s => s.assistantOpen)
  const setOpen = useUIStore(s => s.setAssistantOpen)
  const isMobile = useIsMobile()
  useCommand('app.assistant', () => setOpen(true))
  const [draft, setDraft] = useState('')
  const [turns, setTurns] = useState<HelpTurn[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  const end = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!open) return
    opener.current = document.activeElement as HTMLElement | null
    const frame = requestAnimationFrame(() => {
      const target = panel.current?.querySelector<HTMLElement>('#app-assistant-question:not(:disabled)')
        ?? panel.current?.querySelector<HTMLElement>('button')
      target?.focus()
    })
    return () => {
      cancelAnimationFrame(frame)
      requestAnimationFrame(() => {
        const target = opener.current?.isConnected ? opener.current : document.querySelector<HTMLElement>('[aria-controls="app-assistant"]')
        target?.focus()
      })
    }
  }, [open])
  const followLink = () => { if (isMobile) setOpen(false) }
  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'nearest' }) }, [turns, busy, open])

  const send = async () => {
    const question = draft.trim()
    if (request.current || question.length < 3 || !user?.email_verified_at) return
    const controller = new AbortController()
    request.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 45000)
    setBusy(true)
    setError('')
    try {
      const answer = await askAppHelp(question, turns, helpScreen(location.pathname), locale, controller.signal)
      if (controller.signal.aborted) return
      setTurns(previous => [...previous, { role: 'user', content: question }, answer])
      setDraft('')
    } catch (e) {
      const status = (e as { status?: number }).status
      setError(t(status === 401 ? 'assistant.signIn' : status === 403 ? 'assistant.verify' : status === 429 ? 'assistant.limit' : 'assistant.error'))
    } finally {
      window.clearTimeout(timeout)
      request.current = null
      setBusy(false)
    }
  }

  return <aside id="app-assistant" ref={panel} aria-labelledby="app-assistant-title"
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false) } }}
      className={open ? 'relative flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden bg-bg-secondary md:w-[280px] md:border-l md:border-border-subtle lg:w-[360px] xl:w-[400px]' : 'hidden'}>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border-subtle px-3 md:h-9">
        <button type="button" aria-label={t('assistant.close')} onClick={() => setOpen(false)} className="inline-flex h-9 w-9 items-center justify-center text-text-secondary md:hidden"><ChevronLeft size={20} /></button>
        <Sparkles size={16} className="hidden text-text-muted md:block" aria-hidden="true" />
        <h2 id="app-assistant-title" className="flex-1 text-sm font-semibold text-text-primary">{t('assistant.title')}</h2>
        <button type="button" disabled={busy || !turns.length} aria-label={t('assistant.reset')} title={t('assistant.reset')} onClick={() => { setTurns([]); setDraft(''); setError(''); panel.current?.querySelector<HTMLElement>('#app-assistant-question')?.focus() }} className="p-2 text-text-muted disabled:opacity-40"><RotateCcw size={16} /></button>
        <button type="button" aria-label={t('assistant.close')} onClick={() => setOpen(false)} className="hidden p-2 text-text-muted md:block"><X size={16} /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {!turns.length && <div className="space-y-4 py-4">
          <p className="text-sm text-text-secondary">{t('assistant.welcome')}</p>
          <div>{(['paths', 'offline', 'tutorial'] as const).map(key => <button key={key} type="button" disabled={busy} onClick={() => { setDraft(t(`assistant.suggestion.${key}`)); document.getElementById('app-assistant-question')?.focus() }} className="flex w-full items-center justify-between gap-3 border-b border-border-subtle py-3 text-left text-sm text-text-secondary hover:text-accent"><span>{t(`assistant.suggestion.${key}`)}</span><ArrowRight size={14} className="shrink-0 text-text-muted" aria-hidden="true" /></button>)}</div>
        </div>}
        <div role="log" aria-label={t('assistant.conversation')} aria-live="polite" className="space-y-4">
          {turns.map((turn, index) => <div key={index} className="mt-4 min-w-0">
            <p className="mb-1 text-xs font-semibold text-text-muted">{turn.role === 'assistant' ? 'Apolos' : t('assistant.you')}</p>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-primary [overflow-wrap:anywhere]">{turn.content}</p>
            {!!turn.links?.length && <nav aria-label={t('assistant.links')} className="mt-2 flex flex-col items-start gap-2">{turn.links.map(link => <Link key={link.href} to={link.href} onClick={followLink} className="inline-flex items-center gap-2 py-1 text-sm text-accent hover:underline">{link.label}<ArrowRight size={14} aria-hidden="true" /></Link>)}</nav>}
          </div>)}
        </div>
        {busy && <p role="status" className="mt-4 text-sm text-text-muted">{t('assistant.thinking')}</p>}
        <div ref={end} />
      </div>
      <footer className="shrink-0 p-3">
        {!user ? <button type="button" onClick={() => { setOpen(false); openAuthModal('login') }} className="text-sm text-accent">{t('assistant.signIn')}</button>
          : !user.email_verified_at ? <p className="text-sm text-text-secondary">{t('assistant.verify')} <Link to={paths.settings()} onClick={followLink} className="text-accent">{t('assistant.settings')}</Link></p>
          : <form className="rounded-md border border-border-subtle bg-bg-primary p-2 focus-within:border-accent/50" onSubmit={event => { event.preventDefault(); void send() }}>
            <label htmlFor="app-assistant-question" className="sr-only">{t('assistant.question')}</label>
            <textarea id="app-assistant-question" value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} rows={2} disabled={busy}
              placeholder={t('assistant.question')} className="w-full resize-none bg-transparent p-1 text-sm text-text-primary outline-none disabled:opacity-60"
              onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send() } }} />
            <div className="flex items-center justify-between gap-2 pt-1"><span className="text-xs text-text-muted">{t('assistant.composerHint')}</span><button type="submit" aria-label={t('assistant.send')} title={t('assistant.send')} disabled={busy || draft.trim().length < 3} className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-bg-primary disabled:opacity-40"><ArrowUp size={16} /></button></div>
          </form>}
        {error && <p role="alert" className="mt-2 text-sm text-text-secondary">{error}</p>}
        <div className="mt-2 flex items-center justify-between gap-3 text-2xs text-text-muted"><span>{t('assistant.context')}</span><Link to={paths.help()} onClick={followLink} className="shrink-0 hover:underline">{t('assistant.help')}</Link></div>
      </footer>
    </aside>
}
