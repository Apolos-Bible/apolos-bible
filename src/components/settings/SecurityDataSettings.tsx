import { useEffect, useState } from 'react'
import { Download, KeyRound, Laptop, Loader2, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { relativeTime } from '@/lib/relativeTime'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useTutorialStore } from '@/lib/store/useTutorialStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useWorkspaceStore } from '@/lib/store/useWorkspaceStore'
import { paths } from '@/router/paths'
import { SectionLabel } from '@/components/ui/SectionLabel'

type Session = {
  id: number
  name: string
  last_used_at: string | null
  created_at: string
  current: boolean
}

const CARD = 'rounded-2xl border border-border-subtle bg-bg-secondary p-4 sm:p-5'

export function SecurityDataSettings() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const refreshUser = useAuthStore((state) => state.refreshUser)
  const addToast = useUIStore((state) => state.addToast)
  const openShortcuts = useUIStore((state) => state.toggleShortcutsPanel)
  const resetTutorial = useTutorialStore((state) => state.reset)
  const resetWorkspace = useWorkspaceStore((state) => state.resetWorkspace)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const refresh = () => api.get<Session[]>('/api/user/sessions').then(setSessions)
  useEffect(() => {
    void refresh().finally(() => setLoading(false))
    void refreshUser()
  }, [refreshUser])

  async function revoke(id: number) {
    await api.delete(`/api/user/sessions/${id}`)
    await refresh()
  }

  async function revokeOthers() {
    await api.delete('/api/user/sessions/others')
    await refresh()
    addToast(t('settings.security.sessionsRevoked'), 'success')
  }

  async function exportData(format: 'json' | 'markdown') {
    setExporting(true)
    try {
      const blob = await api.download(`/api/user/export${format === 'markdown' ? '?format=markdown' : ''}`)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `apolos-data-${new Date().toISOString().slice(0, 10)}.${format === 'markdown' ? 'md' : 'json'}`
      anchor.click()
      URL.revokeObjectURL(url)
      addToast(t('settings.data.exported'), 'success')
    } catch {
      addToast(t('common.error'), 'error')
    } finally {
      setExporting(false)
    }
  }

  const providers = user?.connected_providers ?? []

  return (
    <div className="flex flex-col gap-5">
      <header className="border-b border-border-subtle pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{t('settings.security.title')}</h1>
        <p className="mt-1 text-sm text-text-muted">{t('settings.security.subtitle')}</p>
      </header>

      <section className={CARD}>
        <SectionLabel>{t('settings.security.providers')}</SectionLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          {providers.map((provider) => (
            <span key={provider} className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-secondary">
              {provider === 'password' ? <KeyRound size={14} /> : <ShieldCheck size={14} />}
              {t(`settings.security.provider.${provider}`)}
            </span>
          ))}
        </div>
      </section>

      <section className={CARD}>
        <div className="flex items-center justify-between gap-4">
          <SectionLabel>{t('settings.security.sessions')}</SectionLabel>
          {sessions.length > 1 && <button type="button" onClick={() => void revokeOthers()} className="text-xs font-medium text-accent hover:underline">{t('settings.security.closeOthers')}</button>}
        </div>
        {loading ? <Loader2 size={16} className="mt-5 animate-spin text-text-muted" /> : (
          <ul className="mt-2 divide-y divide-border-subtle">
            {sessions.map((session) => <li key={session.id} className="flex items-center gap-3 py-3">
              <Laptop size={17} className="text-text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-text-primary">{session.name}</span>
                <span className="text-xs text-text-muted">{session.current ? t('settings.security.current') : relativeTime(session.last_used_at ?? session.created_at)}</span>
              </span>
              {!session.current && <button type="button" onClick={() => void revoke(session.id)} className="text-xs text-text-muted hover:text-red-400">{t('settings.security.revoke')}</button>}
            </li>)}
          </ul>
        )}
      </section>

      <section className={CARD}>
        <SectionLabel>{t('settings.data.title')}</SectionLabel>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">{t('settings.data.help')}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void exportData('json')} disabled={exporting} className="inline-flex h-9 items-center gap-2 rounded-full border border-border-subtle px-4 text-sm font-medium text-text-secondary hover:bg-bg-tertiary disabled:opacity-50">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {t('settings.data.exportJson')}
          </button>
          <button type="button" onClick={() => void exportData('markdown')} disabled={exporting} className="inline-flex h-9 items-center gap-2 rounded-full border border-border-subtle px-4 text-sm font-medium text-text-secondary hover:bg-bg-tertiary disabled:opacity-50">
            <Download size={14} />{t('settings.data.exportMarkdown')}
          </button>
        </div>
      </section>

      <section className={CARD}>
        <SectionLabel>{t('settings.help.title')}</SectionLabel>
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" onClick={() => { resetTutorial(); navigate(paths.root()) }} className="text-sm font-medium text-accent hover:underline">{t('settings.help.tutorial')}</button>
          <button type="button" onClick={openShortcuts} className="text-sm font-medium text-accent hover:underline">{t('settings.help.shortcuts')}</button>
          <button type="button" onClick={() => { resetWorkspace(); addToast(t('settings.help.workspaceReset'), 'success') }} className="text-sm font-medium text-accent hover:underline">{t('settings.help.resetWorkspace')}</button>
        </div>
      </section>
    </div>
  )
}
