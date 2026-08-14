import { useEffect } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { AppNotification } from '@/types'
import { paths } from '@/router/paths'
import { useNotificationStore } from '@/lib/store/useNotificationStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { PanelHeader, PanelHeaderButton } from '@/components/layout/PanelHeader'
import { gameInvitePath, normalizeGameCode } from '@/lib/gameInvite'
import { notificationPresentation } from './notificationPresentation'

export function NotificationsPanel() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const closePanel = useUIStore((state) => state.closePanel)
  const openPanel = useUIStore((state) => state.openPanel)
  const notifications = useNotificationStore((state) => state.notifications)
  const load = useNotificationStore((state) => state.load)
  const markRead = useNotificationStore((state) => state.markRead)
  const markAllRead = useNotificationStore((state) => state.markAllRead)
  const unreadCount = useNotificationStore((state) => state.unreadCount)

  useEffect(() => { void load() }, [load])

  const openNotification = async (notification: AppNotification) => {
    if (!notification.read_at) await markRead(notification.id)
    const number = (key: string) => typeof notification.data[key] === 'number' ? notification.data[key] as number : null
    const string = (key: string) => typeof notification.data[key] === 'string' ? notification.data[key] as string : null

    if (notification.type === 'friend_request_received') {
      openPanel('friends')
      return
    }
    if (notification.type === 'friend_request_accepted') {
      const userId = number('acceptor_id')
      if (userId) { closePanel(); navigate(paths.userProfile(userId)) }
      return
    }
    if (notification.type === 'game_invitation') {
      const roomCode = normalizeGameCode(string('room_code'))
      closePanel()
      navigate(roomCode ? gameInvitePath(roomCode) : paths.games())
      return
    }
    if (notification.type === 'guided_plan_moderation') {
      const slug = string('plan_slug')
      if (slug) { closePanel(); navigate(paths.pathEditor(slug)) }
    }
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden border-r border-border-subtle bg-bg-secondary">
      <PanelHeader
        title={t('notifications.title')}
        description={t('notifications.description')}
        onClose={closePanel}
        closeLabel={t('notifications.close')}
        actions={unreadCount > 0 ? (
          <PanelHeaderButton onClick={() => void markAllRead()} aria-label={t('notifications.markAllRead')} title={t('notifications.markAllRead')}>
            <CheckCheck className="h-5 w-5 md:h-4 md:w-4" strokeWidth={1.75} />
          </PanelHeaderButton>
        ) : undefined}
      />
      <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        {notifications.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-text-muted">
            <Bell className="h-8 w-8" strokeWidth={1.5} />
            <p className="text-sm">{t('notifications.empty')}</p>
          </div>
        ) : notifications.map((notification) => {
          const presentation = notificationPresentation(notification, t)
          return (
            <button
              type="button"
              key={notification.id}
              onClick={() => void openNotification(notification)}
              className="flex w-full gap-3 border-b border-border-subtle px-4 py-3 text-left hover:bg-bg-tertiary"
              aria-label={presentation.title}
            >
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.read_at ? 'bg-transparent' : 'bg-accent'}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-text-primary">{presentation.title}</span>
                <span className="mt-0.5 block text-xs text-text-muted">{presentation.detail}</span>
                <time className="mt-1 block text-2xs text-text-muted" dateTime={notification.created_at}>
                  {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notification.created_at))}
                </time>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
