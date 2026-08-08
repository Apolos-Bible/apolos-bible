import { expect, test, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test'

const apiUrl = 'http://127.0.0.1:8000'

type Account = { token: string; user: { id: number; name: string; email: string } }

async function register(request: APIRequestContext, name: string, suffix: string): Promise<Account> {
  const response = await request.post(`${apiUrl}/api/auth/register`, {
    data: { name, email: `${suffix}@example.test`, password: 'realtime-secure-password' },
  })
  expect(response.status()).toBe(201)
  return response.json()
}

async function authenticate(target: Page | BrowserContext, account: Account) {
  await target.addInitScript(({ token }) => {
    localStorage.setItem('verbum_token', token)
    localStorage.setItem('tutorial_completed_v1', 'true')
    localStorage.setItem('tutorial_invite_dismissed_v1', 'true')
    localStorage.setItem('analytics_consent', 'denied')
  }, { token: account.token })
}

async function openConversation(page: Page, conversationName: string) {
  await page.goto('/perfil', { waitUntil: 'domcontentloaded' })
  const chatsButton = page.getByRole('button', { name: /Chats|Mensajes/i })
  await expect(chatsButton).toBeVisible()
  await chatsButton.click()
  await page.getByText(conversationName, { exact: true }).filter({ visible: true }).first().click()
  await expect(page.getByPlaceholder(/Write a message|Escribe un mensaje/i)).toBeVisible()
}

test.describe('[CHAT-REALTIME-01][INFRA-REALTIME-01] real Reverb transport', () => {
  test('delivers one message between two authenticated browsers', async ({ browser, page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'fullstack-desktop', 'One desktop multi-browser transport run proves the shared Reverb path')
    test.setTimeout(90_000)
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const recipient = await register(request, 'Realtime Recipient', `recipient-${suffix}`)
    const sender = await register(request, 'Realtime Sender', `sender-${suffix}`)

    const conversationResponse = await request.post(`${apiUrl}/api/conversations`, {
      headers: { Authorization: `Bearer ${sender.token}`, Accept: 'application/json' },
      data: { type: 'group', name: 'Realtime Room', user_ids: [recipient.user.id] },
    })
    expect(conversationResponse.status()).toBe(201)
    const conversation = await conversationResponse.json() as { id: number }

    await authenticate(page, recipient)
    const senderContext = await browser.newContext()
    await authenticate(senderContext, sender)
    const senderPage = await senderContext.newPage()

    try {
      await Promise.all([
        openConversation(page, 'Realtime Room'),
        openConversation(senderPage, 'Realtime Room'),
      ])

      const message = `Reverb delivery ${suffix}`
      await senderPage.getByPlaceholder(/Write a message|Escribe un mensaje/i).fill(message)
      await senderPage.getByRole('button', { name: /^Send$|^Enviar$/i }).click()

      const deliveredMessage = page.getByText(message, { exact: true })
      await expect(deliveredMessage).toBeVisible({ timeout: 10_000 })
      await expect(deliveredMessage).toHaveCount(1)

      await page.context().setOffline(true)
      const missedMessage = `Missed offline ${suffix}`
      const missedResponse = await request.post(`${apiUrl}/api/conversations/${conversation.id}/messages`, {
        headers: { Authorization: `Bearer ${sender.token}`, Accept: 'application/json' },
        data: { body: missedMessage },
      })
      expect(missedResponse.status()).toBe(201)
      await expect(page.getByText(missedMessage, { exact: true })).toHaveCount(0)

      await page.context().setOffline(false)
      // Chromium's CDP offline emulation restores networking but does not
      // consistently dispatch the browser lifecycle event applications use.
      await page.evaluate(() => window.dispatchEvent(new Event('online')))
      await expect(page.getByText(missedMessage, { exact: true })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(missedMessage, { exact: true })).toHaveCount(1)

      const postReconnectMessage = `After reconnect ${suffix}`
      const reconnectedResponse = await request.post(`${apiUrl}/api/conversations/${conversation.id}/messages`, {
        headers: { Authorization: `Bearer ${sender.token}`, Accept: 'application/json' },
        data: { body: postReconnectMessage },
      })
      expect(reconnectedResponse.status()).toBe(201)
      await expect(page.getByText(postReconnectMessage, { exact: true })).toBeVisible({ timeout: 10_000 })
      await expect(page.getByText(postReconnectMessage, { exact: true })).toHaveCount(1)
    } finally {
      await senderContext.close()
    }
  })

  test('[NOTIFY-REALTIME-01] delivers a database notification over the private user channel', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'fullstack-desktop', 'One desktop transport run proves the shared private channel')
    test.setTimeout(60_000)
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const recipient = await register(request, 'Notification Recipient', `notify-recipient-${suffix}`)
    const sender = await register(request, 'Notification Sender', `notify-sender-${suffix}`)
    await authenticate(page, recipient)

    const channelAuthorization = page.waitForResponse((response) =>
      response.url().endsWith('/api/broadcasting/auth') && response.status() === 200,
    )
    await page.goto('/perfil', { waitUntil: 'domcontentloaded' })
    const notificationsButton = page.getByRole('button', { name: /Notifications|Notificaciones/i })
    await expect(notificationsButton).toBeVisible()
    await channelAuthorization

    const friendRequest = await request.post(`${apiUrl}/api/friends/${recipient.user.id}`, {
      headers: { Authorization: `Bearer ${sender.token}`, Accept: 'application/json' },
    })
    expect(friendRequest.status()).toBe(201)

    await expect(page.getByText(`${sender.user.name} sent you a friend request`, { exact: true })).toBeVisible({ timeout: 10_000 })
    await notificationsButton.click()
    await expect(page.locator('.workspace-side-panel-frame:visible').getByText(
      `${sender.user.name} sent you a friend request`,
      { exact: true },
    )).toBeVisible()
  })
})

test.describe('[GAME-REALTIME-01] real Reverb game transport', () => {
  test('synchronizes lobby membership and immediately reconciles a missed game start', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'fullstack-desktop', 'One desktop multi-user run proves the shared game transport')
    test.setTimeout(90_000)
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const host = await register(request, 'Realtime Game Host', `game-host-${suffix}`)
    const guest = await register(request, 'Realtime Game Guest', `game-guest-${suffix}`)
    const hostHeaders = { Authorization: `Bearer ${host.token}`, Accept: 'application/json' }

    const createResponse = await request.post(`${apiUrl}/api/games/rooms`, {
      headers: hostHeaders,
      data: { locale: 'en', round_count: 3 },
    })
    expect(createResponse.status()).toBe(201)
    const room = await createResponse.json() as { id: number; code: string }

    await authenticate(page, host)
    const channelAuthorization = page.waitForResponse((response) =>
      response.url().endsWith('/api/broadcasting/auth')
        && response.request().postData()?.includes(`private-game.room.${room.id}`) === true
        && response.status() === 200,
    )
    await page.goto(`/juegos/${room.id}`, { waitUntil: 'domcontentloaded' })
    await channelAuthorization
    await expect(page.getByText(host.user.name, { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await page.waitForTimeout(250)

    const joinResponse = await request.post(`${apiUrl}/api/games/rooms/join`, {
      headers: { Authorization: `Bearer ${guest.token}`, Accept: 'application/json' },
      data: { code: room.code },
    })
    expect(joinResponse.status()).toBe(200)
    // This deadline is shorter than the five-second safety poll, proving delivery
    // came through the authenticated Reverb room channel.
    await expect(page.getByText(guest.user.name, { exact: true })).toBeVisible({ timeout: 4_500 })

    await page.context().setOffline(true)
    const startResponse = await request.post(`${apiUrl}/api/games/rooms/${room.id}/start`, { headers: hostHeaders })
    expect(startResponse.status()).toBe(200)
    await startResponse.json()
    await expect(page.getByText('1/3', { exact: true })).toHaveCount(0)

    await page.context().setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(page.getByText('1/3', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('1/3', { exact: true })).toHaveCount(1)
  })
})

test.describe('[BIBLE-PRESENCE-01][SOCIAL-PRESENCE-01] real presence transport', () => {
  test('shows only a friend reading the same chapter and removes them when they leave', async ({ browser, page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'fullstack-desktop', 'One two-browser run proves the shared presence transport')
    test.setTimeout(90_000)
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const readerA = await register(request, 'Presence Reader A', `presence-a-${suffix}`)
    const readerB = await register(request, 'Presence Reader B', `presence-b-${suffix}`)
    const friendshipResponse = await request.post(`${apiUrl}/api/friends/${readerB.user.id}`, {
      headers: { Authorization: `Bearer ${readerA.token}`, Accept: 'application/json' },
    })
    expect(friendshipResponse.status()).toBe(201)
    const friendship = await friendshipResponse.json() as { id: number }
    const acceptResponse = await request.patch(`${apiUrl}/api/friend-requests/${friendship.id}/accept`, {
      headers: { Authorization: `Bearer ${readerB.token}`, Accept: 'application/json' },
    })
    expect(acceptResponse.status()).toBe(200)
    const roomResponse = await request.post(`${apiUrl}/api/games/rooms`, {
      headers: { Authorization: `Bearer ${readerA.token}`, Accept: 'application/json' },
      data: { locale: 'en', round_count: 3 },
    })
    expect(roomResponse.status()).toBe(201)
    const room = await roomResponse.json() as { id: number; code: string }
    const roomJoinResponse = await request.post(`${apiUrl}/api/games/rooms/join`, {
      headers: { Authorization: `Bearer ${readerB.token}`, Accept: 'application/json' },
      data: { code: room.code },
    })
    expect(roomJoinResponse.status()).toBe(200)

    await authenticate(page, readerA)
    let readerBContext = await browser.newContext()
    await authenticate(readerBContext, readerB)
    let readerBPage = await readerBContext.newPage()

    const joinPresence = async (target: Page, account: Account, friend: Account) => {
      const authorization = target.waitForResponse((response) =>
        response.url().endsWith('/api/broadcasting/auth')
          && response.request().postData()?.includes('presence-chapter.43.3') === true
          && response.status() === 200,
      )
      await target.evaluate(async ({ selfId, presenceFriend }) => {
        const [{ useFriendStore }, { usePresenceStore }] = await Promise.all([
          import('/src/lib/store/useFriendStore.ts'),
          import('/src/lib/store/usePresenceStore.ts'),
        ])
        useFriendStore.setState({ friends: [presenceFriend] })
        usePresenceStore.getState().joinChapter(43, 3, String(selfId))
      }, { selfId: account.user.id, presenceFriend: friend.user })
      await authorization
    }

    try {
      await page.goto(`/juegos/${room.id}`, { waitUntil: 'domcontentloaded' })
      await joinPresence(page, readerA, readerB)
      await readerBPage.goto(`/juegos/${room.id}`, { waitUntil: 'domcontentloaded' })
      await joinPresence(readerBPage, readerB, readerA)

      const friendNames = (target: Page) => target.evaluate(async () => {
        const { usePresenceStore } = await import('/src/lib/store/usePresenceStore.ts')
        return usePresenceStore.getState().others.map((user) => user.name)
      })
      // Allow one complete five-second authenticated reconciliation interval.
      // Reverb may omit member_added when it coalesces the same member identity,
      // which is the production edge case the heartbeat is designed to repair.
      await expect.poll(() => friendNames(page), { timeout: 10_000 }).toEqual([readerB.user.name])
      await expect.poll(() => friendNames(readerBPage), { timeout: 10_000 }).toEqual([readerA.user.name])

      const leaveHeartbeat = readerBPage.waitForResponse((response) =>
        response.url().endsWith('/api/presence/heartbeat')
          && response.request().postData()?.includes('"_method":"DELETE"') === true
          && response.status() === 204,
      )
      await readerBPage.evaluate(async () => {
        const { usePresenceStore } = await import('/src/lib/store/usePresenceStore.ts')
        usePresenceStore.getState().leaveChapter()
      })
      await leaveHeartbeat
      await expect.poll(() => friendNames(page), { timeout: 15_000 }).toEqual([])

      await joinPresence(readerBPage, readerB, readerA)
      await expect.poll(() => friendNames(readerBPage), { timeout: 15_000 }).toEqual([readerA.user.name])
      await expect.poll(() => friendNames(page), { timeout: 15_000 }).toEqual([readerB.user.name])
    } finally {
      if (readerBContext.pages().length > 0) {
        await readerBPage.evaluate(async () => {
          const { destroyEcho } = await import('/src/lib/echo.ts')
          destroyEcho()
        }).catch(() => {})
        await readerBContext.close()
      }
    }
  })
})
