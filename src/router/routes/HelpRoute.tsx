import { useState } from 'react'
import { AppPageLayout } from '@/components/layout/AppPageLayout'
import { productApi } from '@/lib/productApi'
import { useAuthStore } from '@/lib/store/useAuthStore'

export function HelpRoute() {
  const user = useAuthStore((state) => state.user)
  const [type, setType] = useState<'bug' | 'suggestion' | 'question'>('bug')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (!user || message.trim().length < 5) return
    setBusy(true)
    try {
      await productApi.feedback({ type, message, diagnostics: { app_version: document.documentElement.dataset.appVersion ?? 'unknown', platform: navigator.platform, online: navigator.onLine } })
      setSent(true); setMessage('')
    } finally { setBusy(false) }
  }
  return <AppPageLayout title="Ayuda">
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8">
      <h1 className="text-2xl font-semibold text-text-primary">Ayuda y feedback</h1>
      <p className="mt-2 text-sm text-text-muted">Cuéntanos qué ocurrió. Los diagnósticos nunca incluyen tus notas, mensajes ni tokens.</p>
      <section className="mt-6 rounded-xl border border-border-subtle bg-bg-secondary p-5">
        <label className="text-xs font-medium text-text-secondary">Tipo</label>
        <div className="mt-2 flex gap-2">{([['bug','Problema'],['suggestion','Sugerencia'],['question','Pregunta']] as const).map(([value,label]) => <button key={value} onClick={() => setType(value)} className={`rounded-md border px-3 py-2 text-xs ${type === value ? 'border-accent bg-accent/10 text-accent' : 'border-border-subtle text-text-muted'}`}>{label}</button>)}</div>
        <label htmlFor="feedback-message" className="mt-5 block text-xs font-medium text-text-secondary">Descripción</label>
        <textarea id="feedback-message" value={message} onChange={(event) => setMessage(event.target.value)} rows={7} maxLength={5000} className="mt-2 w-full resize-y rounded-lg border border-border-subtle bg-bg-primary p-3 text-sm text-text-primary outline-none focus:border-accent" placeholder="Describe qué esperabas y qué ocurrió…" />
        {sent && <p role="status" className="mt-3 text-sm text-accent">Gracias. Hemos recibido tu mensaje.</p>}
        <button disabled={busy || !user || message.trim().length < 5} onClick={() => void submit()} className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg-primary disabled:opacity-40">Enviar</button>
      </section>
      <section className="mt-4 rounded-xl border border-border-subtle bg-bg-secondary p-5"><h2 className="text-sm font-semibold text-text-primary">Preguntas frecuentes</h2><details className="mt-3 border-b border-border-subtle py-2 text-sm"><summary className="cursor-pointer text-text-secondary">¿Se guardan mis cambios sin conexión?</summary><p className="mt-2 text-xs leading-relaxed text-text-muted">Las Biblias descargadas funcionan sin conexión. El indicador superior te avisa cuando una modificación sigue pendiente de sincronizar.</p></details><details className="py-2 text-sm"><summary className="cursor-pointer text-text-secondary">¿Cómo reinicio la guía?</summary><p className="mt-2 text-xs text-text-muted">Abre Ajustes → Aplicación → Volver a ver el tutorial.</p></details></section>
    </main>
  </AppPageLayout>
}
