import { beforeAll, describe, expect, it } from 'vitest'
import i18n from '@/lib/i18n'
import type { AppNotification } from '@/types'
import { notificationPresentation } from './notificationPresentation'

beforeAll(async () => { await i18n.changeLanguage('en') })

function notification(type: string, data: Record<string, unknown>): AppNotification {
  return { id: 'notification-1', type, data, read_at: null, created_at: '2026-08-08T10:00:00Z' }
}

describe('[NOTIFY-INBOX-01] notification presentation', () => {
  it('describes friendship notifications with the actor name', () => {
    expect(notificationPresentation(notification('friend_request_received', { requester_name: 'Lucia' }), i18n.t).title)
      .toBe('Lucia sent you a friend request')
    expect(notificationPresentation(notification('friend_request_accepted', { acceptor_name: 'Mateo' }), i18n.t).title)
      .toBe('Mateo accepted your friend request')
  })

  it('describes game invitations with the host name', () => {
    expect(notificationPresentation(notification('game_invitation', { inviter_name: 'Daniel' }), i18n.t))
      .toEqual({
        title: 'Daniel invited you to a Bible game',
        detail: 'Open the invitation to enter the room and play.',
      })
  })

  it('describes moderation updates and preserves their reason', () => {
    const result = notificationPresentation(notification('guided_plan_moderation', {
      event: 'rejected', plan_title: 'Hope', reason: 'Add a source.',
    }), i18n.t)
    expect(result).toEqual({ title: '“Hope” needs changes', detail: 'Add a source.' })
  })

  it('uses safe copy for unknown notification types', () => {
    expect(notificationPresentation(notification('future-event', {}), i18n.t))
      .toEqual({ title: 'New notification', detail: 'Open this notification to see more information.' })
  })
})
