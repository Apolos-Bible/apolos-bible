/* global importScripts, firebase */
// Firebase Cloud Messaging service worker.
//
// The backend (App\Jobs\SendPushJob) sends chat pushes as data-only payloads
// for `web` and `desktop` platforms — that's intentional, so this SW renders
// the notification itself and we can group "3 mensajes nuevos en #grupo".
// The double-render bug that plagues Firebase Web Push (browser banner +
// SW banner) is avoided by never including a `notification` field for these
// platforms.

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js')

// These values are public Firebase web-app config — safe to ship in source.
firebase.initializeApp({
  apiKey: 'AIzaSyB7MYegXC6jIs2EUK6P6hwmiwqKubxVKQA',
  projectId: 'tulia-push',
  messagingSenderId: '205932758475',
  appId: '1:205932758475:web:1aee48ce62a48ca130e24e',
})

const messaging = firebase.messaging()

// ---------- grouping state ----------
// In-memory map keyed by conversation_id → { count, senders:Set, lastBody }.
// SWs can be killed at any moment, so we also persist to IDB. The in-memory
// copy is the fast path; IDB is the recovery path after a wake-up.

const DB_NAME = 'tulia-push'
const STORE = 'chat_groups'
const groups = new Map()

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function loadGroup(id) {
  if (groups.has(id)) return groups.get(id)
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    const stored = await new Promise((res) => {
      req.onsuccess = () => res(req.result || null)
      req.onerror = () => res(null)
    })
    if (stored) {
      const g = { count: stored.count || 0, senders: new Set(stored.senders || []), lastBody: stored.lastBody || '' }
      groups.set(id, g)
      return g
    }
  } catch {
    // ignore
  }
  const empty = { count: 0, senders: new Set(), lastBody: '' }
  groups.set(id, empty)
  return empty
}

async function saveGroup(id, g) {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(
      { count: g.count, senders: Array.from(g.senders), lastBody: g.lastBody },
      id,
    )
  } catch {
    // ignore
  }
}

async function clearGroup(id) {
  groups.delete(id)
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
  } catch {
    // ignore
  }
}

// ---------- background message ----------
messaging.onBackgroundMessage(async (payload) => {
  const data = payload.data || {}
  const event = data.event
  const url = data.url || '/'

  if (event !== 'chat_message') {
    // Other events (note_reply, friend_request, etc.) are simple — single
    // notification, no grouping. Reuse title/body from data.
    await self.registration.showNotification(data.title || 'Tulia', {
      body: data.body || '',
      icon: '/pwa-192x192.png',
      badge: '/favicon.png',
      tag: data.event || 'tulia',
      data: { url },
    })
    return
  }

  const convId = String(data.conversation_id || '0')
  const sender = data.title || 'Tulia'           // SendPushJob puts sender_name in title
  const bodyPreview = data.body || ''             // and body_preview in body

  const g = await loadGroup(convId)
  g.count += 1
  g.senders.add(sender)
  g.lastBody = bodyPreview
  await saveGroup(convId, g)

  let title
  let body
  if (g.count === 1) {
    title = sender
    body = bodyPreview
  } else {
    const senderList = Array.from(g.senders)
    const who = senderList.length === 1
      ? senderList[0]
      : senderList.length === 2
        ? `${senderList[0]} y ${senderList[1]}`
        : `${senderList[0]} y ${senderList.length - 1} más`
    title = who
    body = `${g.count} mensajes nuevos`
  }

  await self.registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/favicon.png',
    tag: `conv_${convId}`,
    renotify: true,
    data: { url, conversation_id: convId },
  })
})

// ---------- click ----------
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const url = data.url || '/'
  const convId = data.conversation_id

  event.waitUntil((async () => {
    if (convId) await clearGroup(convId)

    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of allClients) {
      // Reuse an open tab/window if the same origin is already loaded.
      if ('focus' in client) {
        client.postMessage({ type: 'navigate', url })
        return client.focus()
      }
    }
    if (self.clients.openWindow) {
      return self.clients.openWindow(url)
    }
  })())
})

// ---------- lifecycle ----------
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
