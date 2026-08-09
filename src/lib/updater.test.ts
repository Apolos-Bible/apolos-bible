import { beforeEach, describe, expect, it, vi } from 'vitest'

const isTauri = vi.fn()
const check = vi.fn()
const relaunch = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({ isTauri }))
vi.mock('@tauri-apps/plugin-updater', () => ({ check }))
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch }))

describe('signed desktop updater', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    isTauri.mockReturnValue(true)
    Object.defineProperty(navigator, 'userAgent', { value: 'Desktop test', configurable: true })
    const { resetUpdateCheckForTests } = await import('./updater')
    resetUpdateCheckForTests()
  })

  it('detects an update without downloading or installing it', async () => {
    const downloadAndInstall = vi.fn()
    check.mockResolvedValue({
      version: '1.6.0',
      currentVersion: '1.5.2',
      body: 'Release notes',
      downloadAndInstall,
    })
    const { checkForAppUpdates } = await import('./updater')

    const update = await checkForAppUpdates()

    expect(check).toHaveBeenCalledWith({ timeout: 30_000 })
    expect(update).toMatchObject({ version: '1.6.0', currentVersion: '1.5.2', notes: 'Release notes' })
    expect(downloadAndInstall).not.toHaveBeenCalled()
  })

  it('installs only after an explicit call and reports download progress', async () => {
    const downloadAndInstall = vi.fn(async (onEvent) => {
      onEvent({ event: 'Started', data: { contentLength: 100 } })
      onEvent({ event: 'Progress', data: { chunkLength: 40 } })
      onEvent({ event: 'Progress', data: { chunkLength: 60 } })
      onEvent({ event: 'Finished' })
    })
    const native = { version: '1.6.0', currentVersion: '1.5.2', downloadAndInstall }
    const progress = vi.fn()
    const { installAppUpdate } = await import('./updater')

    await installAppUpdate({ version: '1.6.0', currentVersion: '1.5.2', native: native as never }, progress)

    expect(progress.mock.calls.map(([value]) => value)).toEqual([0, 40, 100, 100])
    expect(relaunch).toHaveBeenCalledOnce()
  })

  it('checks once automatically, supports a forced retry, and skips web and mobile', async () => {
    check.mockResolvedValue(null)
    const { checkForAppUpdates } = await import('./updater')

    await checkForAppUpdates()
    await checkForAppUpdates()
    await checkForAppUpdates({ force: true })
    Object.defineProperty(navigator, 'userAgent', { value: 'Android', configurable: true })
    await checkForAppUpdates({ force: true })
    isTauri.mockReturnValue(false)
    Object.defineProperty(navigator, 'userAgent', { value: 'Desktop test', configurable: true })
    await checkForAppUpdates({ force: true })

    expect(check).toHaveBeenCalledTimes(2)
  })
})
