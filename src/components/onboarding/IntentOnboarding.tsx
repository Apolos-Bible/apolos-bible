import { useState } from 'react'
import { BookOpen, GraduationCap, Heart, Users } from 'lucide-react'
import { productApi } from '@/lib/productApi'

const intents = [
  { id: 'habit', label: 'Crear un hábito', Icon: Heart },
  { id: 'learn', label: 'Conocer la Biblia', Icon: BookOpen },
  { id: 'study', label: 'Estudiar profundamente', Icon: GraduationCap },
  { id: 'friends', label: 'Leer con amigos', Icon: Users },
] as const

export function IntentOnboarding({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0)
  const [intent, setIntent] = useState<(typeof intents)[number]['id']>('habit')
  const [minutes, setMinutes] = useState(10)
  const [busy, setBusy] = useState(false)

  const save = async (completed = false) => {
    setBusy(true)
    try {
      await productApi.onboarding({ step: completed ? 6 : step + 1, completed, preferences: { intent, minutes } })
      if (completed) onFinish(); else setStep((current) => current + 1)
    } finally { setBusy(false) }
  }

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-bg-primary/90 p-4 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="onboarding-title" className="w-full max-w-lg rounded-xl border border-border-subtle bg-bg-secondary p-6">
      <p className="text-2xs uppercase tracking-widest text-accent">Paso {step + 1} de 2</p>
      <h1 id="onboarding-title" className="mt-2 text-xl font-semibold text-text-primary">{step === 0 ? '¿Qué quieres conseguir con Apolos?' : '¿Cuánto tiempo quieres dedicar?'}</h1>
      <p className="mt-2 text-sm text-text-muted">Esto personaliza tu inicio; podrás cambiarlo cuando quieras.</p>
      {step === 0 ? <div className="mt-5 grid grid-cols-2 gap-2">{intents.map(({ id, label, Icon }) => <button key={id} onClick={() => setIntent(id)} className={`flex min-h-24 flex-col items-start justify-between rounded-lg border p-3 text-left text-sm transition-colors ${intent === id ? 'border-accent bg-accent/10 text-accent' : 'border-border-subtle text-text-secondary hover:bg-bg-tertiary'}`}><Icon className="h-5 w-5" />{label}</button>)}</div>
        : <div className="mt-5 grid grid-cols-3 gap-2">{[5, 10, 20].map((value) => <button key={value} onClick={() => setMinutes(value)} className={`rounded-lg border px-3 py-6 text-center ${minutes === value ? 'border-accent bg-accent/10 text-accent' : 'border-border-subtle text-text-secondary'}`}><strong className="block text-xl">{value}</strong><span className="text-xs">minutos</span></button>)}</div>}
      <div className="mt-6 flex justify-between"><button disabled={busy} onClick={() => void save(true)} className="text-sm text-text-muted">Ahora no</button><button disabled={busy} onClick={() => void save(step === 1)} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg-primary disabled:opacity-50">{step === 1 ? 'Crear mi inicio' : 'Continuar'}</button></div>
    </section>
  </div>
}
