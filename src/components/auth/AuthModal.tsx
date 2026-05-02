import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { cn } from '@/lib/cn'

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
        ) : isForgotPassword && sent ? (
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-md font-medium text-text-primary">{t('auth.forgotPasswordTitle')}</h2>
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

              {/* Token — reset password only */}
              {isResetPassword && (
                <Field label={t('auth.resetToken')}>
                  <input
                    type="text"
                    value={token}
                    onChange={e => { setToken(e.target.value); setError('') }}
                    placeholder={t('auth.resetTokenPlaceholder')}
                    autoComplete="off"
                    className={inputCls}
                  />
                </Field>
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
