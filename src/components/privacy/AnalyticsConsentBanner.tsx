import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  canUseGoogleAnalytics,
  onAnalyticsConsentChange,
  readAnalyticsConsent,
  setAnalyticsConsent,
} from '@/lib/analytics'

export function AnalyticsConsentBanner() {
  const { t, i18n } = useTranslation()
  const [visible, setVisible] = useState(
    () => canUseGoogleAnalytics() && readAnalyticsConsent() === null,
  )

  useEffect(() => onAnalyticsConsentChange(() => setVisible(false)), [])

  if (!visible) return null

  const privacyUrl = `https://apolos.io/${i18n.language.startsWith('es') ? 'es' : 'en'}/privacy`

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="analytics-consent-title"
      className="fixed inset-x-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[100] ml-auto flex max-w-md flex-col gap-4 rounded-xl border border-border-subtle bg-bg-secondary p-4 md:bottom-4 md:right-4"
    >
      <div className="flex flex-col gap-1.5">
        <h2 id="analytics-consent-title" className="text-md font-semibold text-text-primary">
          {t('analytics.consent.title')}
        </h2>
        <p className="text-sm leading-relaxed text-text-secondary">
          {t('analytics.consent.description')}{' '}
          <a
            href={privacyUrl}
            target="_blank"
            rel="noreferrer"
            className="text-accent transition-colors hover:text-accent/80"
          >
            {t('analytics.consent.privacy')}
          </a>
        </p>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => setAnalyticsConsent('denied')}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border-subtle px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
        >
          {t('analytics.consent.reject')}
        </button>
        <button
          type="button"
          onClick={() => setAnalyticsConsent('granted')}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t('analytics.consent.accept')}
        </button>
      </div>
    </section>
  )
}
