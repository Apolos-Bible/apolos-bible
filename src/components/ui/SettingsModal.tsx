import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useUIStore, type FontSize, type Theme, type Locale } from '@/lib/store/useUIStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { cn } from '@/lib/cn'

const FONT_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'sm',   label: 'S' },
  { value: 'base', label: 'M' },
  { value: 'lg',   label: 'L' },
]

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'es', label: 'ES' },
  { value: 'en', label: 'EN' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-2xs uppercase tracking-wider text-text-muted px-5">{title}</p>
      <div className="flex flex-col">{children}</div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-2">
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" strokeLinecap="round"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5">
      <path d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function SettingsModal() {
  const { t } = useTranslation()

  const settingsOpen  = useUIStore(s => s.settingsOpen)
  const closeSettings = useUIStore(s => s.closeSettings)
  const fontSize      = useUIStore(s => s.fontSize)
  const setFontSize   = useUIStore(s => s.setFontSize)
  const theme         = useUIStore(s => s.theme)
  const setTheme      = useUIStore(s => s.setTheme)
  const locale        = useUIStore(s => s.locale)
  const setLocale     = useUIStore(s => s.setLocale)

  const versions     = useVerseStore(s => s.versions)
  const versionId    = useVerseStore(s => s.versionId)
  const loadVersions = useVerseStore(s => s.loadVersions)
  const setVersion   = useVerseStore(s => s.setVersion)

  const user   = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  useEffect(() => {
    if (settingsOpen && versions.length === 0) loadVersions()
  }, [settingsOpen])

  if (!settingsOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={closeSettings}
    >
      <div
        className="w-full max-w-sm bg-bg-secondary border border-border-subtle rounded-xl shadow-2xl mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Profile header */}
        <div className="px-5 py-5 border-b border-border-subtle">
          {user ? (
            <div className="flex items-center gap-3">
              <UserAvatar email={user.email} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
                <p className="text-xs text-text-muted truncate">{user.email}</p>
              </div>
              <button
                onClick={closeSettings}
                className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none ml-1"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-muted">{t('settings.notSignedIn')}</p>
              <button
                onClick={closeSettings}
                className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Settings body */}
        <div className="py-4 flex flex-col gap-5">

          {/* Appearance */}
          <Section title={t('settings.appearance')}>
            <Row label={t('settings.theme')}>
              <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
                {(['dark', 'light'] as Theme[]).map(th => (
                  <button
                    key={th}
                    onClick={() => setTheme(th)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      theme === th
                        ? 'bg-bg-secondary text-text-primary shadow-sm'
                        : 'text-text-muted hover:text-text-secondary'
                    )}
                  >
                    {th === 'dark' ? <MoonIcon /> : <SunIcon />}
                    {th === 'dark' ? t('settings.theme.dark') : t('settings.theme.light')}
                  </button>
                ))}
              </div>
            </Row>

            <Row label={t('settings.language')}>
              <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
                {LOCALE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setLocale(opt.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      locale === opt.value
                        ? 'bg-bg-secondary text-text-primary shadow-sm'
                        : 'text-text-muted hover:text-text-secondary'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Row>

            <Row label={t('settings.fontSize')}>
              <div className="flex gap-1">
                {FONT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFontSize(opt.value)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-sm border font-medium transition-colors',
                      fontSize === opt.value
                        ? 'bg-accent/20 border-accent/40 text-accent'
                        : 'bg-bg-tertiary border-border-subtle text-text-secondary hover:text-text-primary',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Row>
          </Section>

          {/* Bible */}
          <Section title={t('settings.bible')}>
            <Row label={t('settings.bible.version')}>
              <select
                value={versionId}
                onChange={e => setVersion(Number(e.target.value))}
                className={cn(
                  'bg-bg-tertiary border border-border-subtle rounded-lg px-3 py-1.5',
                  'text-sm text-text-primary outline-none focus:border-accent/50 transition-colors cursor-pointer',
                )}
              >
                {versions.length === 0 && <option value={versionId}>{t('common.loading')}</option>}
                {versions.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.abbreviation} — {v.name}
                  </option>
                ))}
              </select>
            </Row>
          </Section>

          {/* Account actions */}
          {user && (
            <div className="px-5 pt-1 border-t border-border-subtle mt-1">
              <button
                onClick={() => { logout(); closeSettings() }}
                className="mt-3 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                {t('settings.signOut')}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
