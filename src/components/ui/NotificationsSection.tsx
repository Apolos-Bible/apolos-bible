import { useEffect, useState } from 'react'
import { BellRing, Loader2, MonitorSmartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { relativeTime } from '@/lib/relativeTime'
import { enablePush, pushPermissionState } from '@/lib/push'
import { SectionLabel } from './SectionLabel'
import { Switch } from './Switch'

type Subscription = {
  id: number
  token: string
  platform: 'web' | 'desktop' | 'android' | 'ios'
  device_label: string | null
  last_used_at: string | null
  created_at: string
}

type Preferences = {
  chat_message: boolean
  note_reply: boolean
  note_like: boolean
  friend_request: boolean
  friend_accepted: boolean
  activity_in_chapter: boolean
}

const PREF_KEYS: Record<keyof Preferences, string> = {
  chat_message: 'settings.notifications.pref.chatMessage',
  note_reply: 'settings.notifications.pref.noteReply',
  note_like: 'settings.notifications.pref.noteLike',
  friend_request: 'settings.notifications.pref.friendRequest',
  friend_accepted: 'settings.notifications.pref.friendAccepted',
  activity_in_chapter: 'settings.notifications.pref.activityInChapter',
}

const CARD = 'rounded-2xl border border-border-subtle bg-bg-secondary p-4 sm:p-5'

export function NotificationsSection() {
  const { t } = useTranslation()
  const [subs, setSubs] = useState<Subscription[]>([])
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [permission, setPermission] = useState(pushPermissionState())
  const [enabling, setEnabling] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([
      api.get<Subscription[]>('/api/push/subscriptions'),
      api.get<Preferences>('/api/push/preferences'),
    ])
      .then(([subscriptions, preferences]) => {
        if (!alive) return
        setSubs(subscriptions)
        setPrefs(preferences)
      })
      .catch(() => {
        // The section stays usable even if notification services are unavailable.
      })
      .finally(() => alive && setLoading(false))

    return () => {
      alive = false
    }
  }, [])

  async function refreshSubs() {
    const fresh = await api.get<Subscription[]>('/api/push/subscriptions').catch(() => [])
    setSubs(fresh)
  }

  async function handleEnable() {
    setEnabling(true)
    try {
      const result = await enablePush()
      setPermission(pushPermissionState())
      if (result.ok) await refreshSubs()
    } finally {
      setEnabling(false)
    }
  }

  async function handleRevoke(token: string) {
    await api.delete(`/api/push/subscriptions/${encodeURIComponent(token)}`).catch(() => {})
    await refreshSubs()
  }

  async function togglePref(key: keyof Preferences, value: boolean) {
    if (!prefs) return
    const previous = prefs
    setPrefs({ ...prefs, [key]: value })
    await api.patch('/api/push/preferences', { [key]: value }).catch(() => {
      setPrefs(previous)
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="border-b border-border-subtle pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          {t('settings.nav.notifications')}
        </h1>
        <p className="mt-1 max-w-[58ch] text-sm leading-relaxed text-text-muted">
          {t('settings.notifications.subtitle')}
        </p>
      </header>

      {permission !== 'granted' && (
        <section className={cn(CARD, 'flex flex-col gap-4 sm:flex-row sm:items-center')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <BellRing size={20} strokeWidth={1.6} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">
              {t('settings.notifications.pushTitle')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              {permission === 'denied'
                ? t('settings.notifications.blocked')
                : t('settings.notifications.activatePrompt')}
            </p>
          </div>
          <button
            type="button"
            disabled={permission === 'denied' || enabling}
            onClick={handleEnable}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enabling && <Loader2 size={14} className="animate-spin" />}
            {enabling ? t('settings.notifications.enabling') : t('settings.notifications.enable')}
          </button>
        </section>
      )}

      <section className={CARD}>
        <SectionLabel>{t('settings.notifications.preferences')}</SectionLabel>
        {loading && (
          <div className="flex items-center gap-2 py-8 text-sm text-text-muted">
            <Loader2 size={15} className="animate-spin" />
            {t('common.loading')}
          </div>
        )}
        {prefs && (
          <div className="mt-2 divide-y divide-border-subtle">
            {(Object.keys(PREF_KEYS) as (keyof Preferences)[]).map((key) => {
              const label = t(PREF_KEYS[key] as never)
              return (
                <div key={key} className="flex min-h-[54px] items-center justify-between gap-4 py-2.5">
                  <span className="text-sm text-text-secondary">{label}</span>
                  <Switch
                    checked={prefs[key]}
                    onCheckedChange={(checked) => {
                      void togglePref(key, checked)
                    }}
                    ariaLabel={label}
                  />
                </div>
              )
            })}
          </div>
        )}
      </section>

      {!loading && subs.length > 0 && (
        <section className={CARD}>
          <SectionLabel>{t('settings.notifications.devices')}</SectionLabel>
          <ul className="mt-2 divide-y divide-border-subtle">
            {subs.map((subscription) => (
              <li key={subscription.id} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg-tertiary text-text-muted">
                  <MonitorSmartphone size={17} strokeWidth={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">
                    {subscription.device_label || subscription.platform}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    {subscription.platform} · {relativeTime(subscription.last_used_at)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void handleRevoke(subscription.token)
                  }}
                  className="shrink-0 text-xs font-medium text-text-muted transition-colors hover:text-red-400"
                >
                  {t('settings.notifications.revoke')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
