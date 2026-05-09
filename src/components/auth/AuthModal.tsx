import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { cn } from '@/lib/cn'
import { LogoStacked } from '@/components/brand/Logo'

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://verbum.test'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  initialMode?: Mode
}

type Mode = 'login' | 'register' | 'forgot-password' | 'reset-password'

export function AuthModal({ open, onClose, initialMode = 'login' }: AuthModalProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const login = useAuthStore(s => s.login)
  const register = useAuthStore(s => s.register)
  const forgotPassword = useAuthStore(s => s.forgotPassword)
  const resetPassword = useAuthStore(s => s.resetPassword)
  const addToast = useUIStore(s => s.addToast)

  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setError('')
      setSent(false)
      if (initialMode === 'reset-password') {
        const storedToken = sessionStorage.getItem('reset_token')
        const storedEmail = sessionStorage.getItem('reset_email')
        if (storedToken) { setToken(storedToken); sessionStorage.removeItem('reset_token') }
        if (storedEmail) { setEmail(storedEmail); sessionStorage.removeItem('reset_email') }
      }
    }
  }, [open, initialMode])

  if (!open) return null

  const reset = () => {
    setName('')
    setEmail('')
    setPassword('')
    setPasswordConfirmation('')
    setToken('')
    setError('')
    setLoading(false)
    setSent(false)
  }

  const handleClose = () => {
    onClose()
    setTimeout(reset, 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
        handleClose()
      } else if (mode === 'register') {
        await register(name.trim(), email.trim(), password)
        addToast(
          t(
            'auth.verifyEmailSent',
            'Te enviamos un correo de verificación a {{email}}. Revisa tu bandeja (y la carpeta de spam).',
            { email: email.trim() },
          ),
          'info',
          { duration: 8000 },
        )
        handleClose()
      } else if (mode === 'forgot-password') {
        await forgotPassword(email.trim())
        setSent(true)
      } else if (mode === 'reset-password') {
        await resetPassword(email.trim(), token.trim(), password, passwordConfirmation)
        setPassword('')
        setPasswordConfirmation('')
        setToken('')
        setMode('login')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m: Mode) => { setMode(m); setError(''); setSent(false) }

  const isResetPassword = mode === 'reset-password'
  const isForgotPassword = mode === 'forgot-password'
  const isAuth = mode === 'login' || mode === 'register'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="max-w-sm w-full bg-bg-secondary rounded-xl border border-border-subtle shadow-2xl p-6 mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {isResetPassword ? (
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-md font-medium text-text-primary">{t('auth.resetPasswordTitle')}</h2>
              <p className="text-sm text-text-muted mt-0.5">{t('auth.resetPasswordDescription')}</p>
            </div>
            <button
              onClick={handleClose}
              className="text-text-muted hover:text-text-secondary transition-colors text-lg leading-none ml-4 mt-0.5"
            >
              ×
            </button>
          </div>
        ) : isForgotPassword ? (
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-md font-medium text-text-primary">{t('auth.forgotPasswordTitle')}</h2>
              {!sent && <p className="text-sm text-text-muted mt-0.5">{t('auth.forgotPasswordDescription')}</p>}
            </div>
            <button
              onClick={handleClose}
              className="text-text-muted hover:text-text-secondary transition-colors text-lg leading-none ml-4 mt-0.5"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-md font-medium text-text-primary">
                {mode === 'login' ? t('auth.signInTitle') : t('auth.createAccount')}
              </h2>
              <p className="text-sm text-text-muted mt-0.5">
                {mode === 'login' ? t('auth.welcomeBack') : t('auth.startJourney')}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-text-muted hover:text-text-secondary transition-colors text-lg leading-none ml-4 mt-0.5"
            >
              ×
            </button>
          </div>
        )}

        {/* Mode tabs — only for login/register */}
        {isAuth && (
          <>
            <div className="flex justify-center mb-5">
              <LogoStacked symbolSize={40} textSize={18} />
            </div>
            <div className="flex gap-1 mb-4 bg-bg-tertiary rounded-lg p-1">
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={cn(
                  'flex-1 py-1.5 rounded-md text-sm font-medium transition-colors',
                  mode === m
                    ? 'bg-bg-secondary text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                )}
              >
                {m === 'login' ? t('auth.signIn') : t('auth.register')}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => { window.location.href = `${API_BASE}/api/auth/google/redirect` }}
            className="flex w-full items-center justify-center gap-2.5 bg-bg-tertiary border border-border-subtle rounded-lg py-2.5 text-sm font-medium text-text-primary hover:border-accent/40 transition-colors duration-150 mb-3"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            <span>{mode === 'login' ? t('auth.continueWithGoogle', 'Continuar con Google') : t('auth.signUpWithGoogle', 'Registrarse con Google')}</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-px bg-border-subtle"></div>
            <span className="text-2xs uppercase tracking-wider text-text-muted">{t('auth.or', 'o')}</span>
            <div className="flex-1 h-px bg-border-subtle"></div>
          </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
          {/* Forgot password — sent confirmation */}
          {isForgotPassword && sent ? (
            <div className="text-center py-2">
              <p className="text-sm text-text-secondary">{t('auth.resetLinkSent')}</p>
              <div className="flex items-center justify-center gap-4 mt-3">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-sm text-accent hover:underline"
                >
                  {t('auth.backToLogin')}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('reset-password')}
                  className="text-sm text-accent hover:underline"
                >
                  {t('auth.iHaveToken')}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Name — register only */}
              {mode === 'register' && (
                <Field label={t('auth.name')}>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t('auth.namePlaceholder')}
                    autoComplete="name"
                    autoFocus
                    className={inputCls}
                  />
                </Field>
              )}

              {/* Email */}
              <Field label={t('auth.email')}>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder={t('auth.emailPlaceholder')}
                  autoComplete="email"
                  autoFocus={mode === 'login' || isForgotPassword || isResetPassword}
                  className={inputCls}
                />
              </Field>

              {/* Token — reset password only, hidden from user */}
              {isResetPassword && (
                <input type="hidden" value={token} />
              )}

              {/* Password — login / register / reset */}
              {(isAuth || isResetPassword) && (
                <Field label={isResetPassword ? t('auth.newPassword') : t('auth.password')}>
                  <input
                    type="password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder={isResetPassword ? t('auth.newPasswordPlaceholder') : t('auth.passwordPlaceholder')}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className={inputCls}
                  />
                </Field>
              )}

              {/* Password confirmation — reset password only */}
              {isResetPassword && (
                <Field label={t('auth.confirmPassword')}>
                  <input
                    type="password"
                    value={passwordConfirmation}
                    onChange={e => { setPasswordConfirmation(e.target.value); setError('') }}
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    autoComplete="new-password"
                    className={inputCls}
                  />
                </Field>
              )}

              {error && <p className="text-2xs text-red-400">{error}</p>}

              <SubmitButton
                loading={loading}
                disabled={
                  loading ||
                  !email.trim() ||
                  (isAuth && !password) ||
                  (isResetPassword && (!token.trim() || !password || !passwordConfirmation))
                }
              >
                {loading
                  ? (isResetPassword ? t('auth.resettingPassword')
                    : isForgotPassword ? t('auth.sendingResetLink')
                    : mode === 'login' ? t('auth.signingIn')
                    : t('auth.creatingAccount'))
                  : (isResetPassword ? t('auth.resetPassword')
                    : isForgotPassword ? t('auth.sendResetLink')
                    : mode === 'login' ? t('auth.signIn')
                    : t('auth.createAccount'))}
              </SubmitButton>
            </>
          )}

          {/* Footer links */}
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => switchMode('forgot-password')}
              className="text-2xs text-text-muted hover:text-accent transition-colors self-center -mt-1"
            >
              {t('auth.forgotPassword')}
            </button>
          )}

          {isForgotPassword && !sent && (
            <div className="flex items-center justify-between -mt-1">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-2xs text-text-muted hover:text-accent transition-colors"
              >
                {t('auth.backToLogin')}
              </button>
              <button
                type="button"
                onClick={() => switchMode('reset-password')}
                className="text-2xs text-text-muted hover:text-accent transition-colors"
              >
                {t('auth.iHaveToken')}
              </button>
            </div>
          )}

          {isResetPassword && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-2xs text-text-muted hover:text-accent transition-colors self-center -mt-1"
            >
              {t('auth.backToLogin')}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-text-muted">{label}</label>
      {children}
    </div>
  )
}

function SubmitButton({
  loading,
  disabled,
  children,
}: {
  loading: boolean
  disabled: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={cn(
        'w-full bg-accent text-bg-primary font-medium rounded-lg py-2.5 text-sm mt-1',
        'transition-opacity duration-150',
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
      )}
    >
      {children}
    </button>
  )
}

const inputCls = cn(
  'w-full bg-bg-tertiary border border-border-subtle rounded-lg px-3 py-2.5',
  'text-sm text-text-primary placeholder:text-text-muted',
  'outline-none focus:border-accent/50 transition-colors duration-150'
)
