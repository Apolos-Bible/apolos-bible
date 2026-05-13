// Enable launch-on-login the first time a user signs in on desktop. We
// only flip it on once: if the user later toggles it off in their OS
// settings (or in our future settings UI), we don't second-guess them.

const FLAG = 'verbum_autostart_initialized'

function isDesktop(): boolean {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return false
  const ua = navigator.userAgent.toLowerCase()
  return !ua.includes('android') && !/iphone|ipad|ipod/.test(ua)
}

export async function ensureAutostart(): Promise<void> {
  if (!isDesktop()) return
  if (localStorage.getItem(FLAG) === '1') return

  try {
    const mod = await import('@tauri-apps/plugin-autostart')
    const enabled = await mod.isEnabled()
    if (!enabled) await mod.enable()
    localStorage.setItem(FLAG, '1')
  } catch {
    // Plugin may not be available on this platform — silent no-op.
  }
}
