import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { paths } from '@/router/paths'

export function ImpersonationFinishRoute() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const finish = async () => {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
      const token = new URLSearchParams(hash).get('token')

      // Remove the bearer token from browser history before making requests.
      window.history.replaceState({}, '', window.location.pathname)

      if (!token) {
        useUIStore.getState().addToast(t('impersonation.invalid'), 'error')
        navigate(paths.root(), { replace: true })
        return
      }

      try {
        await useAuthStore.getState().startImpersonation(token)
        useUIStore.getState().addToast(t('impersonation.started'), 'success')
      } catch {
        useUIStore.getState().addToast(t('impersonation.invalid'), 'error')
      }

      navigate(paths.root(), { replace: true })
    }

    void finish()
  }, [navigate, t])

  return null
}
