import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useActivityStore } from '../useActivityStore'

beforeEach(() => {
  useActivityStore.setState({ activityByVerse: {} })
})

describe('useActivityStore', () => {
  it('starts with empty activity', () => {
    expect(useActivityStore.getState().activityByVerse).toEqual({})
  })

  it('recordActivity adds activity for a verse', () => {
    const now = Date.now()
    useActivityStore.getState().recordActivity(1, {
      userId: 10,
      userName: 'Alice',
      action: 'noted',
      ts: now,
    })
    const state = useActivityStore.getState()
    expect(state.activityByVerse[1]).toHaveLength(1)
    expect(state.activityByVerse[1][0]).toMatchObject({ userId: 10, userName: 'Alice', action: 'noted' })
  })

  it('recordActivity appends multiple activities for the same verse', () => {
    const now = Date.now()
    useActivityStore.getState().recordActivity(1, { userId: 10, userName: 'Alice', action: 'noted', ts: now })
    useActivityStore.getState().recordActivity(1, { userId: 11, userName: 'Bob', action: 'highlighted', ts: now })
    expect(useActivityStore.getState().activityByVerse[1]).toHaveLength(2)
  })

  it('recordActivity groups activities by verse', () => {
    const now = Date.now()
    useActivityStore.getState().recordActivity(1, { userId: 10, userName: 'Alice', action: 'noted', ts: now })
    useActivityStore.getState().recordActivity(2, { userId: 11, userName: 'Bob', action: 'highlighted', ts: now })
    expect(useActivityStore.getState().activityByVerse[1]).toHaveLength(1)
    expect(useActivityStore.getState().activityByVerse[2]).toHaveLength(1)
  })

  it('recordActivity prunes expired entries (TTL 30s)', () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)

    useActivityStore.getState().recordActivity(1, { userId: 10, userName: 'Alice', action: 'noted', ts: now - 35_000 })

    vi.advanceTimersByTime(1)
    useActivityStore.getState().recordActivity(1, { userId: 11, userName: 'Bob', action: 'highlighted', ts: now + 1 })

    const state = useActivityStore.getState()
    expect(state.activityByVerse[1]).toHaveLength(1)
    expect(state.activityByVerse[1][0].userId).toBe(11)

    vi.useRealTimers()
  })

  it('clearAll removes all activities', () => {
    const now = Date.now()
    useActivityStore.getState().recordActivity(1, { userId: 10, userName: 'Alice', action: 'noted', ts: now })
    useActivityStore.getState().clearAll()
    expect(useActivityStore.getState().activityByVerse).toEqual({})
  })
})
