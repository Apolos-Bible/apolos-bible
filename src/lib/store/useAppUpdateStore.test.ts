import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppUpdate } from '@/lib/updater'

const checkForAppUpdates = vi.fn()
const installAppUpdate = vi.fn()

vi.mock('@/lib/updater', () => ({ checkForAppUpdates, installAppUpdate }))

const update = {
  version: '1.6.0',
  currentVersion: '1.5.2',
  native: {},
} as AppUpdate

describe('app update decisions', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.clear()
    const { useAppUpdateStore } = await import('./useAppUpdateStore')
    useAppUpdateStore.setState({ status: 'idle', update: null, progress: null })
  })

  it('offers a detected update and lets the user postpone it', async () => {
    checkForAppUpdates.mockResolvedValue(update)
    const { useAppUpdateStore } = await import('./useAppUpdateStore')

    await useAppUpdateStore.getState().check()
    expect(useAppUpdateStore.getState()).toMatchObject({ status: 'available', update })

    useAppUpdateStore.getState().remindLater()
    expect(useAppUpdateStore.getState()).toMatchObject({ status: 'idle', update: null })
    expect(Number(localStorage.getItem('appUpdate.remindAfter'))).toBeGreaterThan(Date.now())

    await useAppUpdateStore.getState().check({ force: true })
    expect(useAppUpdateStore.getState().status).toBe('available')
  })

  it('hides a skipped version from automatic checks but not manual checks', async () => {
    checkForAppUpdates.mockResolvedValue(update)
    const { useAppUpdateStore } = await import('./useAppUpdateStore')

    await useAppUpdateStore.getState().check()
    useAppUpdateStore.getState().skipVersion()
    expect(localStorage.getItem('appUpdate.skippedVersion')).toBe('1.6.0')

    await useAppUpdateStore.getState().check()
    expect(useAppUpdateStore.getState().update).toBeNull()

    await useAppUpdateStore.getState().check({ force: true })
    expect(useAppUpdateStore.getState().update?.version).toBe('1.6.0')
  })

  it('keeps the dialog open for retry when installation fails', async () => {
    checkForAppUpdates.mockResolvedValue(update)
    installAppUpdate.mockRejectedValue(new Error('bad signature'))
    const { useAppUpdateStore } = await import('./useAppUpdateStore')
    await useAppUpdateStore.getState().check()

    await expect(useAppUpdateStore.getState().install()).rejects.toThrow('bad signature')
    expect(useAppUpdateStore.getState()).toMatchObject({ status: 'available', update })
  })
})
