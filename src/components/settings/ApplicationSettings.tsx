import { useEffect, useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { getVersion } from '@tauri-apps/api/app'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { checkForAppUpdates } from '@/lib/updater'
import { useUIStore } from '@/lib/store/useUIStore'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Switch } from '@/components/ui/Switch'

const CARD = 'rounded-2xl border border-border-subtle bg-bg-secondary p-4 sm:p-5'

export function ApplicationSettings() {
  const { t } = useTranslation()
  const addToast = useUIStore((state) => state.addToast)
  const desktop = isTauri()
  const [version, setVersion] = useState('web')
  const [autoUpdate, setAutoUpdate] = useState(localStorage.getItem('autoUpdate') !== 'false')
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (desktop) void getVersion().then(setVersion)
  }, [desktop])

  async function checkNow() {
    setChecking(true)
    try {
      await checkForAppUpdates(addToast, {
        installing: (next) => t('updater.installing', { version: next }),
        installed: t('updater.installed'),
        failed: t('updater.failed'),
        noUpdate: t('settings.application.upToDate'),
      }, { force: true })
    } finally {
      setChecking(false)
    }
  }

  return <div className="flex flex-col gap-5">
    <header className="border-b border-border-subtle pb-5">
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{t('settings.application.title')}</h1>
      <p className="mt-1 text-sm text-text-muted">{t('settings.application.subtitle')}</p>
    </header>
    <section className={CARD}>
      <SectionLabel>{t('settings.application.about')}</SectionLabel>
      <div className="mt-4 flex items-center justify-between gap-4">
        <span className="text-sm text-text-secondary">{t('settings.application.version')}</span>
        <span className="font-mono text-xs text-text-muted">{version}</span>
      </div>
      {desktop && <>
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-border-subtle pt-4">
          <span className="text-sm text-text-secondary">{t('settings.application.autoUpdate')}</span>
          <Switch checked={autoUpdate} onCheckedChange={(value) => { localStorage.setItem('autoUpdate', String(value)); setAutoUpdate(value) }} ariaLabel={t('settings.application.autoUpdate')} />
        </div>
        <button type="button" disabled={checking} onClick={() => void checkNow()} className="mt-4 inline-flex h-9 items-center gap-2 rounded-full border border-border-subtle px-4 text-sm font-medium text-text-secondary hover:bg-bg-tertiary disabled:opacity-50">
          <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />{t('settings.application.check')}
        </button>
      </>}
    </section>
    <section className={CARD}>
      <SectionLabel>{t('settings.application.links')}</SectionLabel>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <a href="https://apolos.io/privacy" target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">{t('settings.application.privacy')}</a>
        <a href="mailto:hola@apolos.io" className="font-medium text-accent hover:underline">{t('settings.application.support')}</a>
      </div>
    </section>
  </div>
}
