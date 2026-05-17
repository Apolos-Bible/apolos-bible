import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/**
 * Bridge page for OAuth handoff from the system browser back into the
 * installed Tauri app. The backend lands the user here (https) and we
 * trigger `tulia://auth/finish#token=...` from a user-initiated click —
 * required because iOS Safari / Android Chrome silently drop server-side
 * 302s to non-http schemes.
 */
export function AuthBridgeRoute() {
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const [launched, setLaunched] = useState(false)

  const error = searchParams.get('error')

  const deepLink = useMemo(() => {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash
    const qs = error ? `?error=${encodeURIComponent(error)}` : ''
    return `tulia://auth/finish${qs}${hash ? `#${hash}` : ''}`
  }, [error])

  useEffect(() => {
    document.title = 'Tulia'
  }, [])

  const open = () => {
    setLaunched(true)
    window.location.href = deepLink
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        </div>

        {error ? (
          <>
            <h1 className="text-lg font-semibold text-text-primary mb-2">
              {t('authBridge.errorTitle', 'No pudimos completar el inicio de sesión')}
            </h1>
            <p className="text-sm text-text-muted mb-6">
              {t('authBridge.errorBody', 'Vuelve a Tulia e inténtalo otra vez.')}
            </p>
            <button
              type="button"
              onClick={open}
              className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              {t('authBridge.returnToApp', 'Volver a Tulia')}
            </button>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-text-primary mb-2">
              {t('authBridge.readyTitle', 'Sesión lista')}
            </h1>
            <p className="text-sm text-text-muted mb-6">
              {t(
                'authBridge.readyBody',
                'Toca el botón para volver a la app de Tulia y terminar de iniciar sesión.',
              )}
            </p>
            <button
              type="button"
              onClick={open}
              className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              {launched
                ? t('authBridge.opening', 'Abriendo Tulia…')
                : t('authBridge.openApp', 'Abrir en Tulia')}
            </button>
            {launched && (
              <p className="mt-4 text-xs text-text-muted">
                {t(
                  'authBridge.fallback',
                  '¿No se abrió la app? Asegúrate de tener Tulia instalada y vuelve a tocar el botón.',
                )}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
