import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { relativeTime } from '@/lib/relativeTime'
import { enablePush, pushPermissionState } from '@/lib/push'

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
  chat_message:        'settings.notifications.pref.chatMessage',
  note_reply:          'settings.notifications.pref.noteReply',
  note_like:           'settings.notifications.pref.noteLike',
  friend_request:      'settings.notifications.pref.friendRequest',
  friend_accepted:     'settings.notifications.pref.friendAccepted',
  activity_in_chapter: 'settings.notifications.pref.activityInChapter',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <p className="px-4 md:px-5 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted select-none">
        {title}
      </p>
      <div className="flex flex-col">{children}</div>
    </div>
  )
}

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
      .then(([s, p]) => {
        if (!alive) return
        setSubs(s)
        setPrefs(p)
      })
      .catch(() => { /* keep nulls */ })
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  async function refreshSubs() {
    const fresh = await api.get<Subscription[]>('/api/push/subscriptions').catch(() => [])
    setSubs(fresh)
  }

  async function handleEnable() {
    setEnabling(true)
    try {
      const res = await enablePush()
      setPermission(pushPermissionState())
      if (res.ok) await refreshSubs()
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
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    await api.patch('/api/push/preferences', { [key]: value }).catch(() => {
      setPrefs(prefs) // revert on failure
    })
  }

  return (
    <Section title={t('settings.nav.notifications')}>
      {permission !== 'granted' && (
        <div className="mx-4 md:mx-5 mb-3 p-3 rounded-lg border border-border-subtle bg-bg-tertiary">
          <p className="text-sm md:text-xs text-text-secondary mb-2">
            {permission === 'denied'
              ? t('settings.notifications.blocked')
              : t('settings.notifications.activatePrompt')}
          </p>
          <button
            type="button"
            disabled={permission === 'denied' || enabling}
            onClick={handleEnable}
            className={cn(
              'h-10 md:h-auto text-sm md:text-xs rounded-md px-3.5 md:px-3 md:py-1.5 font-medium transition-colors',
              'bg-accent/20 text-accent hover:bg-accent/30',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {enabling ? t('settings.notifications.enabling') : t('settings.notifications.enable')}
          </button>
        </div>
      )}

      {!loading && subs.length > 0 && (
        <div className="px-4 md:px-5 mb-3">
          <p className="text-xs md:text-2xs text-text-muted mb-2 md:mb-1.5">{t('settings.notifications.devices')}</p>
          <ul className="flex flex-col">
            {subs.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 text-sm md:text-xs text-text-secondary py-2 md:py-1"
              >
                <span className="truncate">
                  <span className="text-text-primary">{s.device_label || s.platform}</span>
                  <span className="text-text-muted ml-2">· {s.platform}</span>
                  <span className="text-text-muted ml-2">· {relativeTime(s.last_used_at)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRevoke(s.token)}
                  className="text-text-muted hover:text-red-400 shrink-0 cursor-pointer"
                >
                  {t('settings.notifications.revoke')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {prefs && (
        <div className="px-4 md:px-5 flex flex-col">
          {(Object.keys(PREF_KEYS) as (keyof Preferences)[]).map((key) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3 min-h-[52px] md:min-h-0 py-2.5 md:py-1 cursor-pointer"
            >
              <span className="text-[15px] md:text-sm text-text-secondary">{t(PREF_KEYS[key] as never)}</span>
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) => togglePref(key, e.target.checked)}
                className="cursor-pointer accent-accent w-5 h-5 md:w-auto md:h-auto"
              />
            </label>
          ))}
        </div>
      )}
    </Section>
  )
}
