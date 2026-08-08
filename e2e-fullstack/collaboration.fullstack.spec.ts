import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const apiUrl = 'http://127.0.0.1:8000'

type Account = { token: string; user: { id: number; name: string; email: string } }

async function register(request: APIRequestContext, name: string, suffix: string): Promise<Account> {
  const response = await request.post(`${apiUrl}/api/auth/register`, {
    data: { name, email: `${suffix}@example.test`, password: 'collaboration-secure-password' },
  })
  expect(response.status()).toBe(201)
  return response.json()
}

async function connect(page: Page, sessionId: string, token: string) {
  await page.evaluate(async ({ documentName, wsToken }) => {
    const { getOrCreateProvider } = await import('/src/lib/study/hocuspocusClient.ts')
    const provider = getOrCreateProvider(documentName, wsToken)
    ;(window as typeof window & { __collabProvider?: typeof provider }).__collabProvider = provider
    if (provider.status === 'connected' && provider.synced) return
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Hocuspocus did not synchronize')), 15_000)
      const onSynced = ({ state }: { state: boolean }) => {
        if (!state) return
        window.clearTimeout(timeout)
        provider.off('synced', onSynced)
        resolve()
      }
      provider.on('synced', onSynced)
    })
  }, { documentName: sessionId, wsToken: token })
}

async function setValue(page: Page, key: string, value: string) {
  await page.evaluate(({ mapKey, mapValue }) => {
    const provider = (window as typeof window & {
      __collabProvider: { document: { getMap: (name: string) => { set: (key: string, value: string) => void } } }
    }).__collabProvider
    provider.document.getMap('fullstack-collaboration').set(mapKey, mapValue)
  }, { mapKey: key, mapValue: value })
}

async function getValue(page: Page, key: string): Promise<string | undefined> {
  return page.evaluate((mapKey) => {
    const provider = (window as typeof window & {
      __collabProvider: { document: { getMap: (name: string) => { get: (key: string) => string | undefined } } }
    }).__collabProvider
    return provider.document.getMap('fullstack-collaboration').get(mapKey)
  }, key)
}

async function disconnect(page: Page) {
  await page.evaluate(() => {
    const provider = (window as typeof window & { __collabProvider: { disconnect: () => void } }).__collabProvider
    provider.disconnect()
  })
}

test.describe('[STUDY-COLLAB-01][INFRA-COLLAB-01] real Hocuspocus transport', () => {
  test('merges concurrent/offline edits and reloads the persisted Yjs snapshot', async ({ browser, page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'fullstack-desktop', 'One two-browser run proves the shared Hocuspocus protocol')
    test.setTimeout(90_000)
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const host = await register(request, 'Collaboration Host', `collab-host-${suffix}`)
    const editor = await register(request, 'Collaboration Editor', `collab-editor-${suffix}`)
    const hostHeaders = { Authorization: `Bearer ${host.token}`, Accept: 'application/json' }

    const createResponse = await request.post(`${apiUrl}/api/studies`, {
      headers: hostHeaders,
      data: { type: 'free', title: `Full-stack collaboration ${suffix}` },
    })
    expect(createResponse.status()).toBe(201)
    const created = await createResponse.json() as { session: { id: string }; ws_token: string }
    const joinResponse = await request.post(`${apiUrl}/api/studies/${created.session.id}/join`, {
      headers: { Authorization: `Bearer ${editor.token}`, Accept: 'application/json' },
    })
    expect(joinResponse.status()).toBe(200)
    const joined = await joinResponse.json() as { ws_token: string }

    const editorContext = await browser.newContext()
    const editorPage = await editorContext.newPage()
    await Promise.all([
      page.goto('/missing', { waitUntil: 'domcontentloaded' }),
      editorPage.goto('/missing', { waitUntil: 'domcontentloaded' }),
    ])

    try {
      await Promise.all([
        connect(page, created.session.id, created.ws_token),
        connect(editorPage, created.session.id, joined.ws_token),
      ])

      await Promise.all([
        setValue(page, 'host-online', `host-${suffix}`),
        setValue(editorPage, 'editor-online', `editor-${suffix}`),
      ])
      await expect.poll(() => getValue(page, 'editor-online')).toBe(`editor-${suffix}`)
      await expect.poll(() => getValue(editorPage, 'host-online')).toBe(`host-${suffix}`)

      await editorContext.setOffline(true)
      await editorPage.evaluate(async ({ documentName, wsToken }) => {
        const { destroyAllProviders, getOrCreateProvider } = await import('/src/lib/study/hocuspocusClient.ts')
        destroyAllProviders()
        const provider = getOrCreateProvider(documentName, wsToken)
        ;(window as typeof window & { __collabProvider?: typeof provider }).__collabProvider = provider
      }, { documentName: created.session.id, wsToken: joined.ws_token })
      await setValue(editorPage, 'editor-offline', `offline-${suffix}`)
      await setValue(page, 'host-during-offline', `online-${suffix}`)
      await editorContext.setOffline(false)
      await editorPage.evaluate(async () => {
        const provider = (window as typeof window & {
          __collabProvider: { status: string; synced: boolean; on: (event: string, callback: (value: { state: boolean }) => void) => void }
        }).__collabProvider
        if (provider.status === 'connected' && provider.synced) return
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error('Hocuspocus reconnect timed out')), 15_000)
          provider.on('synced', ({ state }) => {
            if (!state) return
            window.clearTimeout(timeout)
            resolve()
          })
        })
      })
      await expect.poll(() => getValue(page, 'editor-offline')).toBe(`offline-${suffix}`)
      await expect.poll(() => getValue(editorPage, 'host-during-offline')).toBe(`online-${suffix}`)

      await disconnect(editorPage)
      await disconnect(page)
      await page.waitForTimeout(500)
      await page.evaluate(async () => {
        const { destroyAllProviders } = await import('/src/lib/study/hocuspocusClient.ts')
        destroyAllProviders()
        delete (window as typeof window & { __collabProvider?: unknown }).__collabProvider
      })
      await connect(page, created.session.id, created.ws_token)
      await expect.poll(() => getValue(page, 'editor-offline')).toBe(`offline-${suffix}`)
      await expect.poll(() => getValue(page, 'host-during-offline')).toBe(`online-${suffix}`)
    } finally {
      await editorPage.evaluate(async () => {
        const { destroyAllProviders } = await import('/src/lib/study/hocuspocusClient.ts')
        destroyAllProviders()
      }).catch(() => {})
      await editorContext.close()
    }
  })
})
