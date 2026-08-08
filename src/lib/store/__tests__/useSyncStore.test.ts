import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSyncStore } from '../useSyncStore'

describe('[SYNC-STATUS-01] sync status', () => {
  beforeEach(() => { vi.useFakeTimers(); useSyncStore.setState({ state: 'idle', pending: 0, error: undefined }) })
  it('tracks a confirmed save and returns to idle', () => {
    useSyncStore.getState().begin()
    expect(useSyncStore.getState()).toMatchObject({ state: 'saving', pending: 1 })
    useSyncStore.getState().succeed()
    expect(useSyncStore.getState()).toMatchObject({ state: 'saved', pending: 0 })
    vi.advanceTimersByTime(2200)
    expect(useSyncStore.getState().state).toBe('idle')
  })
  it('keeps failed work pending', () => {
    useSyncStore.getState().begin(); useSyncStore.getState().fail('No disponible')
    expect(useSyncStore.getState()).toMatchObject({ state: 'error', pending: 1, error: 'No disponible' })
  })
})
