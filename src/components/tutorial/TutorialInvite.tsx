import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTutorialStore } from '@/lib/store/useTutorialStore'

export function TutorialInvite() {
  const { t } = useTranslation()
  const inviteOpen   = useTutorialStore((s) => s.inviteOpen)
  const active       = useTutorialStore((s) => s.active)
  const showInvite   = useTutorialStore((s) => s.showInvite)
  const dismissInvite = useTutorialStore((s) => s.dismissInvite)
  const start        = useTutorialStore((s) => s.start)

  useEffect(() => {
    const id = setTimeout(() => showInvite(), 2500)
    return () => clearTimeout(id)
  }, [showInvite])

  useEffect(() => {
    ;(window as unknown as { tuliaTour?: () => void }).tuliaTour = () => {
      useTutorialStore.getState().reset()
    }
  }, [])

  if (!inviteOpen || active) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 w-72 rounded-lg border border-border-subtle bg-bg-secondary p-3 shadow-2xl">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-accent">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
              <path d="M8 2v12M2 8h12" strokeLinecap="round" />
            </svg>
          </span>
          <p className="text-sm font-medium text-text-primary">{t('tutorial.invite.title')}</p>
        </div>
        <button
          onClick={dismissInvite}
          className="text-text-muted hover:text-text-secondary transition-colors"
          aria-label={t('common.close')}
        >
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="h-3 w-3">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>
      </div>
      <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">
        {t('tutorial.invite.body')}
      </p>
      <div className="mt-3 flex items-center justify-end gap-1.5">
        <button
          onClick={dismissInvite}
          className="rounded px-2.5 py-1 text-xs text-text-muted hover:text-text-secondary hover:bg-bg-tertiary transition-colors"
        >
          {t('tutorial.invite.skip')}
        </button>
        <button
          onClick={start}
          className="rounded bg-accent px-2.5 py-1 text-xs font-medium text-bg-primary hover:opacity-90 transition-opacity"
        >
          {t('tutorial.invite.start')}
        </button>
      </div>
    </div>
  )
}
