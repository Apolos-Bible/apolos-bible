import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUIStore } from '@/lib/store/useUIStore'

export function ResetPasswordRoute() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get('token') ?? searchParams.get('reset_token')
    const email = searchParams.get('email') ?? searchParams.get('reset_email')

    if (token && email) {
      sessionStorage.setItem('reset_token', token)
      sessionStorage.setItem('reset_email', email)
      useUIStore.getState().openAuthModal('reset-password')
    } else {
      useUIStore.getState().openAuthModal('forgot-password')
    }

    navigate('/', { replace: true })
  }, [navigate, searchParams])

  return null
}
