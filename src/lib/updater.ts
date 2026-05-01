import { isTauri } from '@tauri-apps/api/core'
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'

let hasCheckedForUpdates = false

type Notify = (
  message: string,
  type?: 'success' | 'error' | 'info',
  options?: { duration?: number },
) => void

export async function checkForAppUpdates(notify: Notify, messages: {
  installing: (version: string) => string
  installed: string
  failed: string
}) {
  if (hasCheckedForUpdates || !isTauri()) return
  hasCheckedForUpdates = true
  let installingUpdate = false

  try {
    const update = await check({ timeout: 30_000 })
    if (!update) return

    installingUpdate = true
    notify(messages.installing(update.version), 'info', { duration: 10_000 })
    await update.downloadAndInstall()
    notify(messages.installed, 'success', { duration: 3_000 })
    await relaunch()
  } catch (error) {
    console.warn('Update check failed', error)
    if (installingUpdate) {
      notify(messages.failed, 'error', { duration: 8_000 })
    }
  }
}
