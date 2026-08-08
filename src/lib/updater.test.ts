import { beforeEach, describe, expect, it, vi } from 'vitest'

const isTauri = vi.fn()
const check = vi.fn()
const relaunch = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({ isTauri }))
vi.mock('@tauri-apps/plugin-updater', () => ({ check }))
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch }))

const messages = {
  installing: (version: string) => `Installing ${version}`,
  installed: 'Installed',
  failed: 'Failed',
  noUpdate: 'Current',
}

describe('signed desktop updater', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    isTauri.mockReturnValue(true)
  })

  it('downloads, installs and relaunches after a signed update is found', async () => {
    const downloadAndInstall = vi.fn().mockResolvedValue(undefined)
    check.mockResolvedValue({ version: '1.6.0', downloadAndInstall })
    const notify = vi.fn()
    const { checkForAppUpdates } = await import('./updater')

    await checkForAppUpdates(notify, messages)

    expect(check).toHaveBeenCalledWith({ timeout: 30_000 })
    expect(downloadAndInstall).toHaveBeenCalledOnce()
    expect(notify).toHaveBeenNthCalledWith(1, 'Installing 1.6.0', 'info', { duration: 10_000 })
    expect(notify).toHaveBeenNthCalledWith(2, 'Installed', 'success', { duration: 3_000 })
    expect(relaunch).toHaveBeenCalledOnce()
  })

  it('reports that the installed version is current', async () => {
    check.mockResolvedValue(null)
    const notify = vi.fn()
    const { checkForAppUpdates } = await import('./updater')

    await checkForAppUpdates(notify, messages)

    expect(notify).toHaveBeenCalledWith('Current', 'success')
    expect(relaunch).not.toHaveBeenCalled()
  })

  it('reports installation failures without relaunching', async () => {
    const downloadAndInstall = vi.fn().mockRejectedValue(new Error('bad signature'))
    check.mockResolvedValue({ version: '1.6.0', downloadAndInstall })
    const notify = vi.fn()
    const { checkForAppUpdates } = await import('./updater')

    await checkForAppUpdates(notify, messages)

    expect(notify).toHaveBeenLastCalledWith('Failed', 'error', { duration: 8_000 })
    expect(relaunch).not.toHaveBeenCalled()
  })

  it('checks once automatically, supports a forced retry, and skips web', async () => {
    check.mockResolvedValue(null)
    const { checkForAppUpdates } = await import('./updater')
    const notify = vi.fn()

    await checkForAppUpdates(notify, messages)
    await checkForAppUpdates(notify, messages)
    await checkForAppUpdates(notify, messages, { force: true })
    isTauri.mockReturnValue(false)
    await checkForAppUpdates(notify, messages, { force: true })

    expect(check).toHaveBeenCalledTimes(2)
  })
})
