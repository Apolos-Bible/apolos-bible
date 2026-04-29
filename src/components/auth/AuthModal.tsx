import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { cn } from '@/lib/cn'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

type Mode = 'login' | 'register'

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const login = useAuthStore(s => s.login)
  const register = useAuthStore(s => s.register)

  if (!open) return null

  const reset = () => {
    setName(''); setEmail(''); setPassword(''); setError(''); setLoading(false)
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
      } else {
        await register(name.trim(), email.trim(), password)
      }
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m: Mode) => { setMode(m); setError('') }

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

        {/* Mode tabs */}
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
          {mode === 'register' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-name" className="text-sm text-text-secondary">{t('auth.name')}</label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('auth.namePlaceholder')}
                autoComplete="name"
                autoFocus
                className={inputCls}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-email" className="text-sm text-text-secondary">{t('auth.email')}</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus={mode === 'login'}
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-password" className="text-sm text-text-secondary">{t('auth.password')}</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className={inputCls}
            />
          </div>

          {error && <p className="text-2xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className={cn(
              'w-full bg-accent text-bg-primary font-medium rounded-lg py-2.5 text-sm mt-1',
              'transition-opacity',
              (loading || !email.trim() || !password) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
            )}
          >
            {loading
              ? (mode === 'login' ? t('auth.signingIn') : t('auth.creatingAccount'))
              : (mode === 'login' ? t('auth.signIn') : t('auth.createAccount'))}
          </button>
        </form>
      </div>
    </div>
  )
}

const inputCls = cn(
  'w-full bg-bg-tertiary border border-border-subtle rounded-lg px-3 py-2.5',
  'text-sm text-text-primary placeholder:text-text-muted',
  'outline-none focus:border-accent/50 transition-colors'
)
