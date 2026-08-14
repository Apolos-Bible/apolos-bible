import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useRouteError } from 'react-router-dom'
import { paths } from '@/router/paths'
import { useAuthStore } from '@/lib/store/useAuthStore'

function PageState({
  title,
  message,
  children,
}: {
  title: string
  message: string
  children: ReactNode
}) {
  return (
    <div className="flex h-screen items-center justify-center bg-bg-primary p-8 text-center text-text-primary">
      <div className="max-w-md space-y-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-text-secondary">{message}</p>
        {children}
      </div>
    </div>
  )
}

function BackToReadingButton() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={() => navigate(paths.root(), { replace: true })}
      className="rounded-md border border-border-subtle px-3 py-1.5 text-sm"
    >
      {t('route.backToReading')}
    </button>
  )
}

function describeRouteError(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message
  if (error && typeof error === 'object') {
    const candidate = error as { status?: unknown; statusText?: unknown; message?: unknown }
    const summary = [candidate.status, candidate.statusText, candidate.message]
      .filter((part) => typeof part === 'string' || typeof part === 'number')
      .join(' ')
    if (summary) return summary
  }
  return String(error)
}

/** A normal catch-all route. It is not inside a data-router error boundary. */
export function NotFound() {
  const { t } = useTranslation()

  return (
    <PageState title={t('route.notFoundTitle')} message={t('route.notFoundMessage')}>
      <BackToReadingButton />
    </PageState>
  )
}

/** Only use this component as `errorElement`, where useRouteError is valid. */
export function RouteErrorPage() {
  const { t } = useTranslation()
  const error = useRouteError()
  const impersonating = useAuthStore((state) => Boolean(state.user?.impersonation?.active))
  const diagnostic = describeRouteError(error)

  useEffect(() => {
    console.error('[Apolos route error]', error)
  }, [error])

  return (
    <PageState title={t('route.errorTitle')} message={t('route.errorMessage')}>
      {impersonating && (
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-red-400/30 bg-red-400/10 p-3 text-left font-mono text-xs text-red-400">
          {diagnostic}
        </pre>
      )}
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg-primary"
        >
          {t('route.reload')}
        </button>
        <BackToReadingButton />
      </div>
    </PageState>
  )
}
