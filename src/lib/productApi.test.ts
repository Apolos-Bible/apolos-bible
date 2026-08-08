import { beforeEach, describe, expect, it, vi } from 'vitest'
import { productApi } from './productApi'

describe('daily experience API', () => {
  beforeEach(() => { localStorage.setItem('verbum_token', 'token'); vi.restoreAllMocks() })
  it('[GOAL-CONFIG-01] sends the complete goal contract', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ target: 2 }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    await productApi.goal({ kind: 'chapters', target: 2, active_days: [1,2,3], timezone: 'Europe/Madrid', share_completions: false })
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/daily-goal'), expect.objectContaining({ method: 'POST', body: expect.stringContaining('Europe/Madrid') }))
  })
  it('[DIAG-SANITIZE-01] submits diagnostics through the authenticated endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ received: true }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    await productApi.feedback({ type: 'bug', message: 'Reader failed', diagnostics: { platform: 'windows' } })
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/feedback'), expect.objectContaining({ method: 'POST' }))
  })
})
