import { beforeEach, describe, expect, it, vi } from 'vitest'

const providerState = vi.hoisted(() => ({ instances: [] as any[] }))
vi.mock('@hocuspocus/provider', () => ({
  HocuspocusProvider: class MockProvider {
    disconnect = vi.fn()
    destroy = vi.fn()
    on = vi.fn()
    document: unknown
    options: unknown
    constructor(options: any) {
      this.options = options
      this.document = options.document
      providerState.instances.push(this)
    }
  },
}))

import { destroyAllProviders, destroyProvider, getOrCreateProvider } from '../hocuspocusClient'

describe('[STUDY-COLLAB-01] provider lifecycle', () => {
  beforeEach(() => {
    destroyAllProviders()
    providerState.instances.length = 0
  })

  it('shares one provider per session and releases it after the final consumer', () => {
    const first = getOrCreateProvider('study-1', 'token-a') as any
    const second = getOrCreateProvider('study-1', 'token-a') as any
    expect(second).toBe(first)
    expect(providerState.instances).toHaveLength(1)
    destroyProvider('study-1')
    expect(first.destroy).not.toHaveBeenCalled()
    destroyProvider('study-1')
    expect(first.disconnect).toHaveBeenCalledOnce()
    expect(first.destroy).toHaveBeenCalledOnce()
  })

  it('rotates a provider immediately when its authorization token changes', () => {
    const oldProvider = getOrCreateProvider('study-1', 'token-a') as any
    const replacement = getOrCreateProvider('study-1', 'token-b') as any
    expect(replacement).not.toBe(oldProvider)
    expect(oldProvider.disconnect).toHaveBeenCalledOnce()
    expect(oldProvider.destroy).toHaveBeenCalledOnce()
    expect((replacement.options as any)).toMatchObject({ name: 'study-1', token: 'token-b', connect: true })
  })
})
