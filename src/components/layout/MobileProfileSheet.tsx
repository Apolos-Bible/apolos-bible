import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useUIStore, type FontSize, type Locale, type Theme } from '@/lib/store/useUIStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useNotificationStore } from '@/lib/store/useNotificationStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { StartStudyModal } from '@/components/study/StartStudyModal'
import { NotificationsSection } from '@/components/ui/NotificationsSection'
import { cn } from '@/lib/cn'
import { BookOpen, Star, NotebookPen } from 'lucide-react'

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 'sm',   label: 'S' },
  { value: 'base', label: 'M' },
  { value: 'lg',   label: 'L' },
]

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'es', label: 'ES' },
  { value: 'en', label: 'EN' },
]

interface RowProps {
  icon: ReactNode
  label: string
  badge?: number
  onClick: () => void
}

function NavRow({ icon, label, badge, onClick }: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[48px] items-center gap-3 rounded-md px-3 py-3 text-left text-[15px] text-text-primary hover:bg-bg-tertiary transition-colors"
    >
      <span className="w-5 h-5 flex items-center justify-center text-text-secondary shrink-0">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-bg-primary text-xs font-medium flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted select-none">
      {children}
    </p>
  )
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 min-h-[56px]">
      <span className="text-[15px] text-text-secondary">{label}</span>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1 13c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5" strokeLinecap="round" />
      <circle cx="12" cy="5" r="1.5" />
      <path d="M12 9.5c1.5.2 3 1.2 3 3.5" strokeLinecap="round" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" strokeLinecap="round" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z" strokeLinejoin="round" />
    </svg>
  )
}

export function MobileProfileSheet() {
  const { t } = useTranslation()
  const openAuthModal = useUIStore((s) => s.openAuthModal)
  const togglePanel = useUIStore((s) => s.togglePanel)
  const closeMobileSidebar = useUIStore((s) => s.closeMobileSidebar)
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const fontSize = useUIStore((s) => s.fontSize)
  const setFontSize = useUIStore((s) => s.setFontSize)
  const locale = useUIStore((s) => s.locale)
  const setLocale = useUIStore((s) => s.setLocale)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const deleteAccount = useAuthStore((s) => s.deleteAccount)
  const resendVerification = useAuthStore((s) => s.resendVerification)
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const friendsUnread = useNotificationStore((s) => s.unreadCount)
  const versions = useVerseStore((s) => s.versions)
  const versionId = useVerseStore((s) => s.versionId)
  const loadVersions = useVerseStore((s) => s.loadVersions)
  const setVersion = useVerseStore((s) => s.setVersion)
  const addToast = useUIStore((s) => s.addToast)

  const [showStartStudy, setShowStartStudy] = useState(false)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (versions.length === 0) loadVersions()
  }, [versions.length, loadVersions])

  const navigatePanel = (panel: Parameters<typeof togglePanel>[0]) => {
    if (!user) {
      openAuthModal()
      return
    }
    closeMobileSidebar()
    togglePanel(panel)
  }

  const handleDelete = async () => {
    if (!deletePassword) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteAccount(deletePassword)
      addToast(t('settings.deleteAccount.success'), 'success')
      closeMobileSidebar()
    } catch (e: unknown) {
      const msg = (e as Error).message || String(e)
      const isBadPassword = /password/i.test(msg)
      setDeleteError(isBadPassword ? t('settings.deleteAccount.wrongPassword') : t('settings.deleteAccount.failed'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="flex h-full flex-col bg-bg-secondary">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle px-4">
          <span className="text-base font-semibold text-text-primary">{t('nav.profile')}</span>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Account header */}
          {user ? (
            <div className="px-4 pt-4 pb-4">
              <div className="flex items-center gap-3">
                <UserAvatar email={user.email} size="md" className="w-12 h-12 text-base" />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-text-primary truncate">{user.name}</p>
                  <p className="text-sm text-text-muted truncate">{user.email}</p>
                </div>
              </div>
              {user.email_verified_at ? (
                <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-emerald-500">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {t('settings.emailVerified')}
                </p>
              ) : (
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-500">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {t('settings.emailUnverified')}
                  </span>
                  <button
                    type="button"
                    disabled={resendState === 'sending'}
                    onClick={async () => {
                      if (resendState === 'sending') return
                      setResendState('sending')
                      try {
                        const res = await resendVerification()
                        if (res.verified) await refreshUser()
                        setResendState('sent')
                      } catch {
                        setResendState('idle')
                      }
                    }}
                    className="text-xs text-accent hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendState === 'sending'
                      ? t('settings.emailResending')
                      : resendState === 'sent'
                        ? t('settings.emailResent')
                        : t('settings.emailResend')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { void refreshUser() }}
                    className="text-xs text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    {t('settings.emailCheckAgain')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 pt-4 pb-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-bg-tertiary border border-border-subtle flex items-center justify-center shrink-0">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5 text-text-muted">
                  <circle cx="8" cy="6" r="2.5" />
                  <path d="M2 13c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round" />
                </svg>
              </div>
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="flex-1 inline-flex h-11 items-center justify-center rounded-md bg-accent text-bg-primary text-[15px] font-medium hover:opacity-90 transition-opacity"
              >
                {t('nav.signIn')}
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="border-t border-border-subtle pt-2 px-2 pb-2">
            <NavRow
              icon={<Star className="w-5 h-5" strokeWidth={1.6} />}
              label={t('nav.favorites')}
              onClick={() => navigatePanel('favorites')}
            />
            <NavRow
              icon={<NotebookPen className="w-5 h-5" strokeWidth={1.6} />}
              label={t('nav.myNotes')}
              onClick={() => navigatePanel('my-notes')}
            />
            <NavRow
              icon={<PeopleIcon />}
              label={t('nav.friends')}
              badge={friendsUnread}
              onClick={() => navigatePanel('friends')}
            />
            <NavRow
              icon={<BookOpen className="w-5 h-5" strokeWidth={1.6} />}
              label={t('nav.newStudy')}
              onClick={() => user ? setShowStartStudy(true) : openAuthModal()}
            />
          </div>

          {/* Appearance */}
          <div className="border-t border-border-subtle">
            <SectionLabel>{t('settings.appearance')}</SectionLabel>
            <SettingRow label={t('settings.theme')}>
              <div className="inline-flex items-center gap-1 bg-bg-tertiary rounded-lg p-1 h-11">
                {(['dark', 'light'] as Theme[]).map((th) => (
                  <button
                    key={th}
                    type="button"
                    onClick={() => setTheme(th)}
                    className={cn(
                      'inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-colors',
                      theme === th
                        ? 'bg-bg-secondary text-text-primary shadow-sm'
                        : 'text-text-muted hover:text-text-secondary',
                    )}
                  >
                    {th === 'dark' ? <MoonIcon /> : <SunIcon />}
                    {th === 'dark' ? t('settings.theme.dark') : t('settings.theme.light')}
                  </button>
                ))}
              </div>
            </SettingRow>

            <SettingRow label={t('settings.language')}>
              <div className="inline-flex items-center gap-1 bg-bg-tertiary rounded-lg p-1 h-11">
                {LOCALES.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLocale(opt.value)}
                    className={cn(
                      'h-9 px-3.5 rounded-md text-sm font-medium transition-colors',
                      locale === opt.value
                        ? 'bg-bg-secondary text-text-primary shadow-sm'
                        : 'text-text-muted hover:text-text-secondary',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </SettingRow>

            <SettingRow label={t('settings.fontSize')}>
              <div className="flex gap-1.5">
                {FONT_SIZES.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFontSize(opt.value)}
                    className={cn(
                      'w-11 h-11 rounded-lg border text-sm font-medium transition-colors',
                      fontSize === opt.value
                        ? 'bg-accent/15 border-accent/40 text-accent'
                        : 'bg-bg-tertiary border-border-subtle text-text-secondary hover:text-text-primary',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </SettingRow>
          </div>

          {/* Bible */}
          <div className="border-t border-border-subtle">
            <SectionLabel>{t('settings.bible')}</SectionLabel>
            <SettingRow label={t('settings.bible.version')}>
              <select
                value={versionId}
                onChange={(e) => setVersion(Number(e.target.value))}
                className="h-11 bg-bg-tertiary border border-border-subtle rounded-lg px-3 text-sm text-text-primary outline-none focus:border-accent/50 transition-colors cursor-pointer max-w-[60vw]"
              >
                {versions.length === 0 && <option value={versionId}>{t('common.loading')}</option>}
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.abbreviation} — {v.name}
                  </option>
                ))}
              </select>
            </SettingRow>
          </div>

          {/* Notifications */}
          {user && (
            <div className="border-t border-border-subtle pb-2">
              <NotificationsSection />
            </div>
          )}

          {/* Account actions */}
          {user && (
            <div className="border-t border-border-subtle px-4 pt-4 pb-6">
              <button
                type="button"
                onClick={async () => {
                  closeMobileSidebar()
                  await logout()
                }}
                className="block text-[15px] text-red-400 hover:text-red-300 transition-colors"
              >
                {t('settings.signOut')}
              </button>

              {!deleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="mt-3 block text-sm text-text-muted hover:text-red-400 transition-colors"
                >
                  {t('settings.deleteAccount')}
                </button>
              ) : (
                <div className="mt-4 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                  <p className="text-xs text-text-secondary mb-3">
                    {t('settings.deleteAccount.confirm')}
                  </p>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => { setDeletePassword(e.target.value); setDeleteError('') }}
                    placeholder={t('settings.deleteAccount.passwordPlaceholder')}
                    className={cn(
                      'w-full h-11 bg-bg-tertiary border rounded-lg px-3 text-sm text-text-primary outline-none transition-colors',
                      deleteError ? 'border-red-500' : 'border-border-subtle focus:border-accent/50',
                    )}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleDelete() }}
                  />
                  {deleteError && (
                    <p className="text-xs text-red-400 mt-1.5">{deleteError}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting || !deletePassword}
                      className="flex-1 h-11 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                    >
                      {deleting ? t('settings.deleteAccount.deleting') : t('settings.deleteAccount.yesDelete')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDeleteConfirm(false); setDeletePassword(''); setDeleteError('') }}
                      disabled={deleting}
                      className="flex-1 h-11 rounded-lg border border-border-subtle text-text-secondary text-sm font-medium hover:bg-bg-tertiary transition-colors"
                    >
                      {t('settings.deleteAccount.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <StartStudyModal open={showStartStudy} onClose={() => setShowStartStudy(false)} />
    </>
  )
}
