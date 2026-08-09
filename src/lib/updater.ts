import { isTauri } from '@tauri-apps/api/core'
import { relaunch } from '@tauri-apps/plugin-process'
import { check, type DownloadEvent, type Update } from '@tauri-apps/plugin-updater'

let hasCheckedForUpdates = false

export type AppUpdate = {
  version: string
  currentVersion: string
  date?: string
  notes?: string
  native: Update
}

export function isDesktopApp() {
  if (!isTauri()) return false
  return !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export async function checkForAppUpdates(options: { force?: boolean } = {}): Promise<AppUpdate | null> {
  if (!isDesktopApp() || (!options.force && hasCheckedForUpdates)) return null
  hasCheckedForUpdates = true

  const update = await check({ timeout: 30_000 })
  if (!update) return null

  return {
    version: update.version,
    currentVersion: update.currentVersion,
    date: update.date,
    notes: update.body,
    native: update,
  }
}

export async function installAppUpdate(
  update: AppUpdate,
  onProgress?: (progress: number | null) => void,
) {
  let downloaded = 0
  let total: number | undefined

  const handleDownload = (event: DownloadEvent) => {
    if (event.event === 'Started') {
      total = event.data.contentLength
      onProgress?.(total ? 0 : null)
    } else if (event.event === 'Progress') {
      downloaded += event.data.chunkLength
      onProgress?.(total ? Math.min(100, Math.round((downloaded / total) * 100)) : null)
    } else {
      onProgress?.(100)
    }
  }

  await update.native.downloadAndInstall(handleDownload)
  await relaunch()
}

export function resetUpdateCheckForTests() {
  hasCheckedForUpdates = false
}
