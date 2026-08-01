import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { setToken } from '@/lib/api'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { resetUserSession } from '@/lib/userSession'
import { consumeAuthReturnPath } from '@/lib/authReturnPath'

export function GoogleFinishRoute() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const finish = async () => {
      const returnPath = consumeAuthReturnPath()
      const error = searchParams.get('error')
      if (error) {
        useUIStore.getState().addToast(
          t('auth.googleFailed', 'No pudimos iniciar sesión con Google. Inténtalo de nuevo.'),
          'error',
        )
        navigate(returnPath, { replace: true })
        return
      }

      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
      const token = new URLSearchParams(hash).get('token')

      if (!token) {
        navigate(returnPath, { replace: true })
        return
      }

      resetUserSession()
      setToken(token)
      try {
        await useAuthStore.getState().init()
        useUIStore.getState().closeAuthModal()
        useUIStore.getState().addToast(
          t('auth.signedInWithGoogle', 'Sesión iniciada con Google'),
          'success',
        )
      } catch {
        useUIStore.getState().addToast(
          t('auth.googleFailed', 'No pudimos iniciar sesión con Google. Inténtalo de nuevo.'),
          'error',
        )
      }
      navigate(returnPath, { replace: true })
    }
    void finish()
  }, [navigate, searchParams, t])

  return null
}
