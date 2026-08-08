import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

let _echo: Echo<'reverb'> | null = null
let _hasConnected = false
const _reconnectListeners = new Set<() => void>()
let _onlineHandler: (() => void) | null = null

export function onEchoReconnect(listener: () => void): () => void {
  _reconnectListeners.add(listener)
  return () => { _reconnectListeners.delete(listener) }
}

function hasEchoConfig(): boolean {
  return Boolean(
    import.meta.env.VITE_API_URL &&
    import.meta.env.VITE_REVERB_APP_KEY &&
    import.meta.env.VITE_REVERB_HOST &&
    import.meta.env.VITE_REVERB_PORT,
  )
}

export function initEcho(): Echo<'reverb'> | null {
  if (_echo) return _echo
  if (!hasEchoConfig()) return null

  const token = localStorage.getItem('verbum_token') ?? ''

  _echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST ?? 'localhost',
    wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${import.meta.env.VITE_API_URL ?? 'https://apolos.test'}/api/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
    Pusher,
  })

  const connection = (_echo.connector as unknown as {
    pusher: { connection: { bind: (event: string, callback: (states: { current: string }) => void) => void } }
  }).pusher.connection
  connection.bind('state_change', ({ current }) => {
    if (current !== 'connected') return
    if (_hasConnected) _reconnectListeners.forEach((listener) => listener())
    _hasConnected = true
  })
  _onlineHandler ??= () => _reconnectListeners.forEach((listener) => listener())
  window.addEventListener('online', _onlineHandler)

  return _echo
}

export function getEcho(): Echo<'reverb'> | null {
  return _echo
}

export function destroyEcho(): void {
  _echo?.disconnect()
  _echo = null
  _hasConnected = false
  if (_onlineHandler) window.removeEventListener('online', _onlineHandler)
  _onlineHandler = null
}
