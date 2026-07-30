import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BadgeCheck, Camera, KeyRound, Loader2, Mail, Moon, Sun } from 'lucide-react'
import { AppPageLayout } from '@/components/layout/AppPageLayout'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { NotificationsSection } from '@/components/ui/NotificationsSection'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/cn'
import { paths } from '@/router/paths'
import { useUIStore, DEFAULT_ACCENT_COLOR, type FontSize, type Locale, type ReadingMode, type Theme } from '@/lib/store/useUIStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useAuthStore } from '@/lib/store/useAuthStore'

const FONT_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'base', label: 'M' },
  { value: 'lg', label: 'L' },
]

const ACCENT_PRESETS = [
  DEFAULT_ACCENT_COLOR, // blue (default)
  '#4fa393', // teal
  '#c17a54', // terracotta
  '#a78bfa', // violet
  '#34d399', // emerald
  '#e0748a', // rose
]

const NAV = [
  { id: 'cuenta', label: 'settings.nav.account' },
  { id: 'apariencia', label: 'settings.nav.appearance' },
  { id: 'biblia', label: 'settings.nav.bible' },
  { id: 'privacidad', label: 'settings.nav.privacy' },
  { id: 'notificaciones', label: 'settings.nav.notifications' },
  { id: 'peligro', label: 'settings.nav.danger' },
] as const

type SectionId = (typeof NAV)[number]['id']

function isSectionId(value: string): value is SectionId {
  return NAV.some((n) => n.id === value)
}

function SettingRow({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-4 min-h-[44px]">
        <span className="text-sm text-text-secondary">{label}</span>
        <div className="shrink-0">{children}</div>
      </div>
      {help && <p className="text-2xs text-text-muted leading-snug max-w-[52ch]">{help}</p>}
    </div>
  )
}

const INPUT =
  'w-full rounded-xl border border-border-subtle bg-bg-secondary px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent/60 focus:ring-2 focus:ring-accent/10'
const SAVE_BTN =
  'inline-flex h-9 items-center justify-center rounded-full bg-accent px-4 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40'
const SETTINGS_CARD = 'rounded-2xl border border-border-subtle bg-bg-secondary p-4 sm:p-5'

export function SettingsRoute() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const uploadAvatar = useAuthStore((s) => s.uploadAvatar)
  const removeAvatar = useAuthStore((s) => s.removeAvatar)
  const changePassword = useAuthStore((s) => s.changePassword)
  const setContentPublicDefault = useAuthStore((s) => s.setContentPublicDefault)
  const resendVerification = useAuthStore((s) => s.resendVerification)
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const logout = useAuthStore((s) => s.logout)
  const deleteAccount = useAuthStore((s) => s.deleteAccount)

  const openAuthModal = useUIStore((s) => s.openAuthModal)
  const addToast = useUIStore((s) => s.addToast)
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const accentColor = useUIStore((s) => s.accentColor)
  const setAccentColor = useUIStore((s) => s.setAccentColor)
  const [customPickerOpen, setCustomPickerOpen] = useState(false)
  const [customPreview, setCustomPreview] = useState(accentColor)
  const customPickerRef = useRef<HTMLDivElement>(null)
  useEffect(() => setCustomPreview(accentColor), [accentColor])
  useEffect(() => {
    if (!customPickerOpen) return
    const onDown = (e: MouseEvent) => {
      if (!customPickerRef.current?.contains(e.target as Node)) setCustomPickerOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCustomPickerOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [customPickerOpen])
  const locale = useUIStore((s) => s.locale)
  const setLocale = useUIStore((s) => s.setLocale)
  const fontSize = useUIStore((s) => s.fontSize)
  const setFontSize = useUIStore((s) => s.setFontSize)
  const readingMode = useUIStore((s) => s.readingMode)
  const setReadingMode = useUIStore((s) => s.setReadingMode)

  const versions = useVerseStore((s) => s.versions)
  const versionId = useVerseStore((s) => s.versionId)
  const loadVersions = useVerseStore((s) => s.loadVersions)
  const setVersion = useVerseStore((s) => s.setVersion)

  // One section at a time, Linear-style. The active section IS the URL hash
  // (/ajustes#apariencia), so deep links, refresh, and back/forward all keep
  // working with no extra state.
  const hashSection = location.hash.replace('#', '')
  const activeNav: SectionId = isSectionId(hashSection) ? hashSection : 'cuenta'
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectSection = (id: string) => {
    if (id === activeNav) return
    navigate(`${paths.settings()}#${id}`, { replace: true })
  }

  // Account form state
  const [name, setName] = useState(user?.name ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [savingName, setSavingName] = useState(false)
  const [savingBio, setSavingBio] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Email verification
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

  // Password change
  const [showPw, setShowPw] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Auth guard — wait for init() so a deep link doesn't bounce a logged-in
  // user while the session is still loading.
  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal()
      navigate(paths.root(), { replace: true })
    }
  }, [authLoading, user, openAuthModal, navigate])

  // Keep each form field in sync with the store independently, so saving one
  // field never clobbers unsaved edits in the other.
  useEffect(() => {
    setName(user?.name ?? '')
  }, [user?.name])
  useEffect(() => {
    setBio(user?.bio ?? '')
  }, [user?.bio])

  useEffect(() => {
    if (versions.length === 0) loadVersions()
  }, [versions.length, loadVersions])

  // On section change: reset the page scroll and move focus to the section
  // for keyboard/screen-reader continuity.
  useLayoutEffect(() => {
    wrapperRef.current?.closest('main')?.scrollTo({ top: 0 })
    document.getElementById(activeNav)?.focus({ preventScroll: true })
  }, [activeNav])

  // Number keys 1–6 switch sections (advertised by the rail's kbd hints)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= NAV.length) {
        e.preventDefault()
        selectSection(NAV[n - 1].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNav])

  if (!user) return null

  const nameDirty = name.trim() !== (user.name ?? '') && name.trim().length >= 2
  const bioDirty = bio !== (user.bio ?? '')

  const saveName = async () => {
    if (!nameDirty) return
    setSavingName(true)
    try {
      await updateProfile({ name: name.trim() })
      addToast(t('settings.saved'), 'success')
    } catch {
      addToast(t('common.error'), 'error')
    } finally {
      setSavingName(false)
    }
  }

  const saveBio = async () => {
    if (!bioDirty) return
    setSavingBio(true)
    try {
      await updateProfile({ bio: bio.trim() || null })
      addToast(t('settings.saved'), 'success')
    } catch {
      addToast(t('common.error'), 'error')
    } finally {
      setSavingBio(false)
    }
  }

  const onPickAvatar = async (file: File) => {
    setAvatarBusy(true)
    try {
      await uploadAvatar(file)
      addToast(t('settings.saved'), 'success')
    } catch {
      addToast(t('settings.avatar.failed'), 'error')
    } finally {
      setAvatarBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onRemoveAvatar = async () => {
    setAvatarBusy(true)
    try {
      await removeAvatar()
    } catch {
      addToast(t('common.error'), 'error')
    } finally {
      setAvatarBusy(false)
    }
  }

  // Google-only accounts have no local password yet — let them set one
  // without a "current password" field.
  const hasPassword = user.has_password !== false
  const pwValid = (!hasPassword || pwCurrent) && pwNew.length >= 8 && pwNew === pwConfirm
  const savePassword = async () => {
    setPwError('')
    if (pwNew.length < 8) return setPwError(t('settings.password.tooShort'))
    if (pwNew !== pwConfirm) return setPwError(t('settings.password.mismatch'))
    setPwSaving(true)
    try {
      await changePassword(pwCurrent, pwNew, pwConfirm)
      addToast(t('settings.password.success'), 'success')
      setShowPw(false)
      setPwCurrent('')
      setPwNew('')
      setPwConfirm('')
      if (!hasPassword) await refreshUser() // has_password flipped to true
    } catch (e) {
      const msg = (e as Error).message || ''
      setPwError(/current|actual|incorrect/i.test(msg) ? t('settings.password.wrongCurrent') : t('common.error'))
    } finally {
      setPwSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletePassword) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteAccount(deletePassword)
      addToast(t('settings.deleteAccount.success'), 'success')
      navigate(paths.root(), { replace: true })
    } catch (e) {
      const msg = (e as Error).message || ''
      setDeleteError(/password/i.test(msg) ? t('settings.deleteAccount.wrongPassword') : t('settings.deleteAccount.failed'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppPageLayout title={t('settings.title')}>
      <div ref={wrapperRef} className="mx-auto w-full max-w-5xl px-4 py-0 md:flex md:gap-10 md:px-8 md:py-8">
        {/* Desktop rail */}
        <aside className="sticky top-8 hidden w-48 shrink-0 self-start md:block">
          <nav className="flex flex-col gap-1 rounded-2xl border border-border-subtle bg-bg-secondary p-2">
            {NAV.map((n, i) => (
              <button
                key={n.id}
                type="button"
                onClick={() => selectSection(n.id)}
                aria-current={activeNav === n.id ? 'true' : undefined}
                className={cn(
                  'flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-100',
                  activeNav === n.id
                    ? 'bg-accent/10 font-medium text-accent'
                    : 'text-text-muted hover:bg-bg-tertiary hover:text-text-secondary',
                )}
              >
                <span>{t(n.label)}</span>
                <kbd className="text-2xs font-mono text-text-muted">{i + 1}</kbd>
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile chip strip */}
        <nav className="md:hidden sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto border-b border-border-subtle bg-bg-secondary/95 px-4 py-2 backdrop-blur no-scrollbar">
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => selectSection(n.id)}
              aria-current={activeNav === n.id ? 'true' : undefined}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                activeNav === n.id ? 'bg-accent/15 text-accent' : 'bg-bg-tertiary text-text-muted',
              )}
            >
              {t(n.label)}
            </button>
          ))}
        </nav>

        {/* Sections */}
        <div className="flex-1 min-w-0 flex flex-col gap-10 py-6 md:py-0">
          {/* ── Cuenta ─────────────────────────────────────────── */}
          {activeNav === 'cuenta' && (
            <section id="cuenta" tabIndex={-1} className="flex flex-col gap-5 outline-none">
              <header className="border-b border-border-subtle pb-5">
                <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
                  {t('settings.nav.account')}
                </h1>
                <p className="mt-1 max-w-[58ch] text-sm leading-relaxed text-text-muted">
                  {t('settings.account.subtitle')}
                </p>
              </header>

              {/* Identity and avatar */}
              <div className={cn(SETTINGS_CARD, 'flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left')}>
                <div className="relative">
                  <UserAvatar
                    name={user.name}
                    email={user.email}
                    src={user.avatar_url}
                    size="2xl"
                    className="h-24 w-24 text-3xl shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={avatarBusy}
                    aria-label={t('settings.avatar.change')}
                    className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-bg-secondary bg-accent text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {avatarBusy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} strokeWidth={1.8} />}
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-semibold text-text-primary">{user.name}</h2>
                  <p className="truncate text-sm text-text-muted">{user.email}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={avatarBusy}
                      className="text-sm font-medium text-accent hover:underline disabled:opacity-50"
                    >
                      {avatarBusy ? t('settings.avatar.uploading') : t('settings.avatar.change')}
                    </button>
                    {user.avatar_url && !avatarBusy && (
                      <button
                        type="button"
                        onClick={onRemoveAvatar}
                        className="text-sm text-text-muted transition-colors hover:text-red-400"
                      >
                        {t('settings.avatar.remove')}
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-2xs text-text-muted">{t('settings.avatar.hint')}</p>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void onPickAvatar(file)
                  }}
                />
              </div>

              {/* Public profile fields */}
              <div className={SETTINGS_CARD}>
                <SectionLabel>{t('settings.profileInformation')}</SectionLabel>
                <div className="mt-4 space-y-5">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="settings-name" className="text-sm font-medium text-text-primary">
                      {t('settings.name')}
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        id="settings-name"
                        value={name}
                        maxLength={50}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveName()
                        }}
                        className={INPUT}
                      />
                      <button
                        type="button"
                        onClick={saveName}
                        disabled={!nameDirty || savingName}
                        className={cn(SAVE_BTN, 'sm:shrink-0')}
                      >
                        {t('settings.save')}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="settings-bio" className="text-sm font-medium text-text-primary">
                        {t('settings.bio')}
                      </label>
                      <span className="text-2xs tabular-nums text-text-muted">
                        {t('settings.bio.counter', { count: bio.length })}
                      </span>
                    </div>
                    <textarea
                      id="settings-bio"
                      value={bio}
                      rows={4}
                      maxLength={280}
                      placeholder={t('settings.bio.placeholder')}
                      onChange={(e) => setBio(e.target.value)}
                      className={cn(INPUT, 'resize-none')}
                    />
                    <div className="flex justify-end pt-0.5">
                      <button type="button" onClick={saveBio} disabled={!bioDirty || savingBio} className={SAVE_BTN}>
                        {t('settings.save')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Access and security */}
              <div className={SETTINGS_CARD}>
                <SectionLabel>{t('settings.security')}</SectionLabel>
                <div className="mt-3 divide-y divide-border-subtle">
                  <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Mail size={18} strokeWidth={1.6} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">{t('settings.email')}</p>
                      <p className="truncate text-sm text-text-muted">{user.email}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {user.email_verified_at ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-2xs font-medium text-emerald-500">
                          <BadgeCheck size={13} strokeWidth={1.8} />
                          {t('settings.emailVerified')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-2xs font-medium text-amber-500">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                          {t('settings.emailUnverified')}
                        </span>
                      )}
                    </div>
                  </div>

                  {!user.email_verified_at && (
                    <div className="flex flex-wrap items-center gap-3 py-3 sm:pl-[52px]">
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
                        className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
                      >
                        {resendState === 'sending'
                          ? t('settings.emailResending')
                          : resendState === 'sent'
                            ? t('settings.emailResent')
                            : t('settings.emailResend')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void refreshUser()}
                        className="text-xs text-text-muted hover:text-text-primary"
                      >
                        {t('settings.emailCheckAgain')}
                      </button>
                    </div>
                  )}

                  <div className="py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <KeyRound size={18} strokeWidth={1.6} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary">
                          {hasPassword ? t('settings.password') : t('settings.password.set')}
                        </p>
                        <p className="text-xs text-text-muted">{t('settings.password.help')}</p>
                      </div>
                      {!showPw && (
                        <button
                          type="button"
                          onClick={() => setShowPw(true)}
                          className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-border-subtle px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                        >
                          {hasPassword ? t('settings.password') : t('settings.password.set')}
                        </button>
                      )}
                    </div>

                    {showPw && (
                      <div className="mt-4 flex flex-col gap-2.5 rounded-2xl bg-bg-tertiary/60 p-4 sm:ml-[52px]">
                        {hasPassword && (
                          <input
                            type="password"
                            autoComplete="current-password"
                            placeholder={t('settings.password.current')}
                            value={pwCurrent}
                            onChange={(e) => {
                              setPwCurrent(e.target.value)
                              setPwError('')
                            }}
                            className={INPUT}
                          />
                        )}
                        <input
                          type="password"
                          autoComplete="new-password"
                          placeholder={t('settings.password.new')}
                          value={pwNew}
                          onChange={(e) => {
                            setPwNew(e.target.value)
                            setPwError('')
                          }}
                          className={INPUT}
                        />
                        <input
                          type="password"
                          autoComplete="new-password"
                          placeholder={t('settings.password.confirm')}
                          value={pwConfirm}
                          onChange={(e) => {
                            setPwConfirm(e.target.value)
                            setPwError('')
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && pwValid) savePassword()
                          }}
                          className={INPUT}
                        />
                        {pwError && <p className="text-xs text-red-400">{pwError}</p>}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={savePassword}
                            disabled={!pwValid || pwSaving}
                            className={SAVE_BTN}
                          >
                            {t('settings.password.save')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPw(false)
                              setPwCurrent('')
                              setPwNew('')
                              setPwConfirm('')
                              setPwError('')
                            }}
                            className="inline-flex h-9 items-center rounded-full border border-border-subtle bg-bg-secondary px-4 text-sm text-text-secondary transition-colors hover:bg-bg-tertiary"
                          >
                            {t('settings.deleteAccount.cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Apariencia ─────────────────────────────────────── */}
          {activeNav === 'apariencia' && (
            <section id="apariencia" tabIndex={-1} className="flex flex-col gap-5 outline-none">
              <header className="border-b border-border-subtle pb-5">
                <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
                  {t('settings.nav.appearance')}
                </h1>
              </header>
              <div className={cn(SETTINGS_CARD, 'divide-y divide-border-subtle [&>div]:py-3 [&>div:first-child]:pt-0 [&>div:last-child]:pb-0')}>
                <SettingRow label={t('settings.theme')}>
                  <SegmentedControl<Theme>
                    ariaLabel={t('settings.theme')}
                    value={theme}
                    onChange={setTheme}
                    options={[
                      { value: 'dark', label: <><Moon size={13} strokeWidth={1.6} />{t('settings.theme.dark')}</> },
                      { value: 'light', label: <><Sun size={13} strokeWidth={1.6} />{t('settings.theme.light')}</> },
                    ]}
                  />
                </SettingRow>
                <SettingRow label={t('settings.accentColor')}>
                  <div className="flex items-center gap-1.5">
                    {ACCENT_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setAccentColor(color)}
                        aria-label={color}
                        aria-current={accentColor.toLowerCase() === color.toLowerCase() ? 'true' : undefined}
                        className={cn(
                          'h-6 w-6 rounded-full border-2 transition-transform',
                          accentColor.toLowerCase() === color.toLowerCase()
                            ? 'border-text-primary scale-110'
                            : 'border-transparent hover:scale-110',
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <div className="relative" ref={customPickerRef}>
                      <button
                        type="button"
                        onClick={() => setCustomPickerOpen((v) => !v)}
                        aria-label={t('settings.accentColor.custom')}
                        title={t('settings.accentColor.custom')}
                        className="ml-1 h-6 w-6 shrink-0 cursor-pointer rounded-full border border-dashed border-border-hover"
                        style={{ backgroundColor: customPreview }}
                      />
                      {customPickerOpen && (
                        <div className="absolute right-0 top-8 z-20 rounded-lg border border-border-subtle bg-surface p-3 shadow-lg">
                          <ColorPicker
                            value={accentColor}
                            onChange={setCustomPreview}
                            onChangeEnd={(hex) => {
                              setCustomPreview(hex)
                              setAccentColor(hex)
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </SettingRow>
                <SettingRow label={t('settings.language')}>
                  <SegmentedControl<Locale>
                    ariaLabel={t('settings.language')}
                    value={locale}
                    onChange={setLocale}
                    options={[{ value: 'es', label: 'ES' }, { value: 'en', label: 'EN' }]}
                  />
                </SettingRow>
                <SettingRow label={t('settings.fontSize')}>
                  <div className="flex gap-1.5">
                    {FONT_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setFontSize(o.value)}
                        className={cn(
                          'h-9 w-9 rounded-lg border text-sm font-medium transition-colors',
                          fontSize === o.value
                            ? 'bg-accent/15 border-accent/40 text-accent'
                            : 'bg-bg-tertiary border-border-subtle text-text-secondary hover:text-text-primary',
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </SettingRow>
                <SettingRow label={t('settings.readingMode')}>
                  <SegmentedControl<ReadingMode>
                    ariaLabel={t('settings.readingMode')}
                    value={readingMode}
                    onChange={setReadingMode}
                    options={[
                      { value: 'verse', label: t('settings.readingMode.verse') },
                      { value: 'flow', label: t('settings.readingMode.flow') },
                    ]}
                  />
                </SettingRow>
              </div>
            </section>
          )}

          {/* ── Biblia ─────────────────────────────────────────── */}
          {activeNav === 'biblia' && (
            <section id="biblia" tabIndex={-1} className="flex flex-col gap-5 outline-none">
              <header className="border-b border-border-subtle pb-5">
                <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
                  {t('settings.nav.bible')}
                </h1>
                <p className="mt-1 text-sm text-text-muted">{t('settings.bible.versionHelp')}</p>
              </header>
              <div className={SETTINGS_CARD}>
                <label className="text-sm font-medium text-text-primary">{t('settings.bible.version')}</label>
                <p className="mt-1 text-xs text-text-muted">{t('settings.bible.versionHelp')}</p>
                <Select
                  value={versionId}
                  onChange={setVersion}
                  ariaLabel={t('settings.bible.version')}
                  disabled={versions.length === 0}
                  placeholder={t('common.loading')}
                  options={versions.map((version) => ({
                    value: version.id,
                    label: `${version.abbreviation} — ${version.name}`,
                  }))}
                  className="mt-4 w-full sm:max-w-md"
                />
              </div>
            </section>
          )}

          {/* ── Privacidad ─────────────────────────────────────── */}
          {activeNav === 'privacidad' && (
            <section id="privacidad" tabIndex={-1} className="flex flex-col gap-5 outline-none">
              <header className="border-b border-border-subtle pb-5">
                <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
                  {t('settings.nav.privacy')}
                </h1>
              </header>
              <div className={SETTINGS_CARD}>
                <SettingRow label={t('settings.privacy.defaultVisibility')} help={t('settings.privacy.help')}>
                  <SegmentedControl<'public' | 'private'>
                    ariaLabel={t('settings.privacy.defaultVisibility')}
                    value={user.content_public_default ? 'public' : 'private'}
                    onChange={(v) => void setContentPublicDefault(v === 'public')}
                    options={[
                      { value: 'private', label: t('settings.privacy.private') },
                      { value: 'public', label: t('settings.privacy.public') },
                    ]}
                  />
                </SettingRow>
              </div>
            </section>
          )}

          {/* ── Notificaciones ─────────────────────────────────── */}
          {activeNav === 'notificaciones' && (
          <section id="notificaciones" tabIndex={-1} className="outline-none">
            <NotificationsSection />
          </section>
          )}

          {/* ── Cuenta y peligro ───────────────────────────────── */}
          {activeNav === 'peligro' && (
            <section id="peligro" tabIndex={-1} className="flex flex-col gap-5 pb-10 outline-none">
              <header className="border-b border-border-subtle pb-5">
                <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
                  {t('settings.nav.danger')}
                </h1>
              </header>
              <div className={cn(SETTINGS_CARD, 'flex flex-col gap-4 border-red-500/20')}>
                <button
                  type="button"
                  onClick={async () => {
                    await logout()
                    navigate(paths.root())
                  }}
                  className="self-start text-sm font-medium text-red-400 transition-colors hover:text-red-300"
                >
                  {t('settings.signOut')}
                </button>

                {!deleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                    className="self-start text-sm text-text-muted transition-colors hover:text-red-400"
                  >
                    {t('settings.deleteAccount')}
                  </button>
                ) : (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
                    <p className="mb-3 text-xs text-text-secondary">{t('settings.deleteAccount.confirm')}</p>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => {
                        setDeletePassword(e.target.value)
                        setDeleteError('')
                      }}
                      placeholder={t('settings.deleteAccount.passwordPlaceholder')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleDelete()
                        if (e.key === 'Escape') setDeleteConfirm(false)
                      }}
                      className={cn(INPUT, deleteError ? 'border-red-500' : '')}
                    />
                    {deleteError && <p className="mt-1.5 text-xs text-red-400">{deleteError}</p>}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting || !deletePassword}
                        className="flex-1 rounded-full bg-red-600 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                      >
                        {deleting ? t('settings.deleteAccount.deleting') : t('settings.deleteAccount.yesDelete')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteConfirm(false)
                          setDeletePassword('')
                          setDeleteError('')
                        }}
                        disabled={deleting}
                        className="flex-1 rounded-full border border-border-subtle py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary"
                      >
                        {t('settings.deleteAccount.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </AppPageLayout>
  )
}
