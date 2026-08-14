import { expect, test, type Page } from '@playwright/test'
import { installApiMock } from './support/mockApi'

const notifications = [{
  id: 'request-1', type: 'friend_request_received',
  data: { requester_id: 21, requester_name: 'Lucia Visible' }, read_at: null, created_at: '2026-08-08T10:00:00Z',
}, {
  id: 'accepted-1', type: 'friend_request_accepted',
  data: { acceptor_id: 21, acceptor_name: 'Lucia Visible' }, read_at: null, created_at: '2026-08-08T09:00:00Z',
}, {
  id: 'moderation-1', type: 'guided_plan_moderation',
  data: { event: 'rejected', plan_slug: 'hope-path', plan_title: 'Ruta de esperanza', reason: 'Añade una fuente.' }, read_at: null, created_at: '2026-08-08T08:00:00Z',
}]

async function openInbox(page: Page, mobile: boolean) {
  if (mobile) {
    await page.getByRole('button', { name: 'Community' }).click()
    await page.getByRole('button', { name: 'Open notifications' }).click()
  } else {
    await page.getByRole('button', { name: 'Notifications' }).click()
  }
}

test.describe('[NOTIFY-INBOX-01] notification inbox', () => {
  test('lists notifications, marks one read and opens its destination', async ({ page }, testInfo) => {
    const requests: string[] = []
    await installApiMock(page, (path, method) => requests.push(`${method} ${path}`), { notifications })
    await page.goto('/')
    await openInbox(page, testInfo.project.name.includes('mobile'))
    const inbox = page.locator('.workspace-side-panel-frame:visible')

    await expect(inbox.getByText('Lucia Visible sent you a friend request')).toBeVisible()
    await expect(inbox.getByText('Lucia Visible accepted your friend request')).toBeVisible()
    await expect(inbox.getByText('“Ruta de esperanza” needs changes')).toBeVisible()

    await inbox.getByRole('button', { name: 'Lucia Visible accepted your friend request' }).click()
    await expect.poll(() => requests).toContain('POST /api/notifications/accepted-1/read')
    await expect(page).toHaveURL(/\/u\/21$/)
  })

  test('marks the complete inbox as read', async ({ page }, testInfo) => {
    const requests: string[] = []
    await installApiMock(page, (path, method) => requests.push(`${method} ${path}`), { notifications })
    await page.goto('/')
    await openInbox(page, testInfo.project.name.includes('mobile'))

    await page.getByRole('button', { name: 'Mark all as read' }).click()
    await expect.poll(() => requests).toContain('POST /api/notifications/read-all')
    await expect(page.getByRole('button', { name: 'Mark all as read' })).toBeHidden()
  })

  test('opens a game invitation and enters the invited room', async ({ page }, testInfo) => {
    const requests: string[] = []
    const gameNotification = [{
      id: 'game-1', type: 'game_invitation',
      data: { room_id: 'invited-game-room', room_code: 'INV123', inviter_id: 21, inviter_name: 'Lucia Visible' },
      read_at: null, created_at: '2026-08-08T11:00:00Z',
    }]
    await installApiMock(page, (path, method) => requests.push(`${method} ${path}`), {
      notifications: gameNotification,
      gameInvitation: true,
    })
    await page.goto('/')
    await openInbox(page, testInfo.project.name.includes('mobile'))
    const inbox = page.locator('.workspace-side-panel-frame:visible')

    const invitation = inbox.getByRole('button', { name: 'Lucia Visible invited you to a Bible game' })
    await expect(invitation).toContainText('Open the invitation to enter the room and play.')
    await invitation.click()

    await expect.poll(() => requests).toContain('POST /api/notifications/game-1/read')
    await expect.poll(() => requests).toContain('POST /api/games/rooms/join')
    await expect(page).toHaveURL(/\/juegos\/invited-game-room$/)
  })
})
