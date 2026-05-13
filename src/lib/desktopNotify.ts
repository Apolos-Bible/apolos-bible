// OS-level notifications fired from Reverb events on desktop Tauri builds.
//
// This is the desktop analog of the firebase-messaging-sw.js path:
// the WebSocket delivers the message in real time (the backend's
// PushDispatcher skips FCM when the user is online), so we render the
// banner directly from JS via tauri-plugin-notification. Keeps grouping
// state in module memory — fine, because the tray process is what's
// keeping it alive.

const counts = new Map<number, { count: number; senders: Set<string>; lastBody: string }>()

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function isDesktop(): boolean {
  if (!isTauri()) return false
  const ua = navigator.userAgent.toLowerCase()
  return !ua.includes('android') && !/iphone|ipad|ipod/.test(ua)
}

export async function notifyChatMessage(
  conversationId: number,
  senderName: string,
  bodyPreview: string,
): Promise<void> {
  if (!isDesktop()) return

  let mod: typeof import('@tauri-apps/plugin-notification')
  try {
    mod = await import('@tauri-apps/plugin-notification')
  } catch {
    return
  }

  const granted = await mod.isPermissionGranted()
  if (!granted) {
    const perm = await mod.requestPermission()
    if (perm !== 'granted') return
  }

  const entry = counts.get(conversationId) ?? { count: 0, senders: new Set<string>(), lastBody: '' }
  entry.count += 1
  entry.senders.add(senderName)
  entry.lastBody = bodyPreview
  counts.set(conversationId, entry)

  let title: string
  let body: string
  if (entry.count === 1) {
    title = senderName
    body = bodyPreview
  } else {
    const list = Array.from(entry.senders)
    title = list.length === 1
      ? list[0]
      : list.length === 2
        ? `${list[0]} y ${list[1]}`
        : `${list[0]} y ${list.length - 1} más`
    body = `${entry.count} mensajes nuevos`
  }

  mod.sendNotification({ title, body })
}

export function clearChatNotifications(conversationId: number): void {
  counts.delete(conversationId)
}
