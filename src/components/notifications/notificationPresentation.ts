import type { TFunction } from 'i18next'
import type { AppNotification } from '@/types'

function text(data: Record<string, unknown>, key: string): string | null {
  return typeof data[key] === 'string' && data[key] ? data[key] as string : null
}

export function notificationPresentation(notification: AppNotification, t: TFunction) {
  const { data, type } = notification
  if (type === 'friend_request_received') {
    const name = text(data, 'requester_name') ?? t('notification.someone')
    return { title: t('notification.friendRequest', { name }), detail: t('notifications.friendRequestDetail') }
  }
  if (type === 'friend_request_accepted') {
    const name = text(data, 'acceptor_name') ?? t('notification.someone')
    return { title: t('notification.friendAccepted', { name }), detail: t('notifications.friendAcceptedDetail') }
  }
  if (type === 'game_invitation') {
    const name = text(data, 'inviter_name') ?? t('notification.someone')
    return { title: t('notification.gameInvitation', { name }), detail: t('notifications.gameInvitationDetail') }
  }
  if (type === 'guided_plan_moderation') {
    const title = text(data, 'plan_title') ?? t('notifications.untitledPath')
    const event = text(data, 'event') ?? text(data, 'moderation_status') ?? 'updated'
    return {
      title: t(`notifications.moderation.${event}`, { title, defaultValue: t('notifications.moderation.updated', { title }) }),
      detail: text(data, 'reason') ?? t('notifications.moderationDetail'),
    }
  }
  return { title: t('notifications.generic'), detail: t('notifications.genericDetail') }
}
