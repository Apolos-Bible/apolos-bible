import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { aiApi, type AiModel, type AiUsageSummary } from '@/lib/aiApi'
import { fetchUserSettings, saveUserSettings } from '@/lib/userSettingsApi'
import { Select } from '@/components/ui/Select'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { useUIStore } from '@/lib/store/useUIStore'

const CARD = 'rounded-2xl border border-border-subtle bg-bg-secondary p-4 sm:p-5'

export function AiSettings() {
  const { t } = useTranslation()
  const addToast = useUIStore((state) => state.addToast)
  const [models, setModels] = useState<AiModel[]>([])
  const [usage, setUsage] = useState<AiUsageSummary | null>(null)
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    void Promise.all([aiApi.models(), aiApi.usage(), fetchUserSettings()])
      .then(([catalog, summary, settings]) => {
        if (!alive) return
        setModels(catalog.models)
        setUsage(summary)
        setSelected(settings.preferred_ai_model ?? '')
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  async function selectModel(value: string) {
    const previous = selected
    setSelected(value)
    if (value) localStorage.setItem('preferredAiModel', value)
    else localStorage.removeItem('preferredAiModel')
    try {
      await saveUserSettings({ preferred_ai_model: value || null })
    } catch {
      setSelected(previous)
      addToast(t('common.error'), 'error')
    }
  }

  return <div className="flex flex-col gap-5">
    <header className="border-b border-border-subtle pb-5">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-text-primary"><Sparkles size={21} className="text-accent" />{t('settings.ai.title')}</h1>
      <p className="mt-1 text-sm text-text-muted">{t('settings.ai.subtitle')}</p>
    </header>
    <section className={CARD}>
      <SectionLabel>{t('settings.ai.model')}</SectionLabel>
      <p className="mt-2 text-xs text-text-muted">{t('settings.ai.modelHelp')}</p>
      {loading ? <Loader2 size={16} className="mt-5 animate-spin text-text-muted" /> : <Select
        value={selected}
        onChange={selectModel}
        ariaLabel={t('settings.ai.model')}
        options={[
          { value: '', label: t('settings.ai.automatic') },
          ...models.map((model) => ({ value: model.slug, label: model.name, description: model.description ?? undefined })),
        ]}
        className="mt-4 w-full sm:max-w-lg"
      />}
    </section>
    {usage && <section className={CARD}>
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>{t('settings.ai.usage')}</SectionLabel>
        <span className="text-xs tabular-nums text-text-muted">{usage.percent_used}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-tertiary"><div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.min(100, usage.percent_used)}%` }} /></div>
      <p className="mt-2 text-xs text-text-muted">{t('settings.ai.usageHelp', { used: usage.tokens_used, limit: usage.tokens_limit, requests: usage.request_count })}</p>
    </section>}
  </div>
}
