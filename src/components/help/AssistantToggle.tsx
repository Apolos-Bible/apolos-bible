import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '@/lib/store/useUIStore'
import { formatBinding } from '@/lib/keyboard'

/** A normal toolbar action; the assistant itself lives in the application layout. */
export function AssistantToggle() {
  const { t } = useTranslation()
  const open = useUIStore(s => s.assistantOpen)
  const setOpen = useUIStore(s => s.setAssistantOpen)
  return <button type="button" onClick={() => setOpen(!open)}
    aria-label={t('assistant.open')} aria-expanded={open} aria-controls="app-assistant"
    title={`${t('assistant.open')} (${formatBinding('mod+shift+j')})`}
    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-bg-tertiary md:h-8 md:w-8 ${open ? 'bg-bg-tertiary text-accent' : 'text-text-secondary'}`}>
    <Sparkles size={18} strokeWidth={1.75} aria-hidden="true" />
  </button>
}
