const BASE = import.meta.env.VITE_API_URL ?? 'https://apolos.test'

export type ApiDebugDetails = {
  exception: string
  file: string
  line: number
  trace: string
}

export class ApiError extends Error {
  status: number
  debug?: ApiDebugDetails

  constructor(message: string, status: number, debug?: ApiDebugDetails) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.debug = debug
  }
}

function getToken(): string | null {
  return localStorage.getItem('verbum_token')
}

export function setToken(token: string): void {
  localStorage.setItem('verbum_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('verbum_token')
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const mutating = !!init.method && init.method !== 'GET'
  if (mutating) (await import('@/lib/store/useSyncStore')).useSyncStore.getState().begin()
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    const validationMessage = err.errors && typeof err.errors === 'object'
      ? Object.values(err.errors).flat().join('\n')
      : null
    const error = new ApiError(
      validationMessage || err.message || res.statusText,
      res.status,
      err.debug,
    )
    if (mutating) (await import('@/lib/store/useSyncStore')).useSyncStore.getState().fail(error.message)
    announceImpersonationError(error)
    throw error
  }
  if (mutating) (await import('@/lib/store/useSyncStore')).useSyncStore.getState().succeed()
  if (res.status === 204) return undefined as T
  return res.json()
}

async function upload<T>(path: string, form: FormData): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { Accept: 'application/json' }
  // Intentionally NOT setting Content-Type: the browser adds the multipart
  // boundary itself. Reusing request() would force application/json.
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { method: 'POST', body: form, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    const validationMessage = err.errors && typeof err.errors === 'object'
      ? Object.values(err.errors).flat().join('\n')
      : null
    const error = new ApiError(
      validationMessage || err.message || res.statusText,
      res.status,
      err.debug,
    )
    announceImpersonationError(error)
    throw error
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

async function download(path: string): Promise<Blob> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    const error = new ApiError(err.message || res.statusText, res.status, err.debug)
    announceImpersonationError(error)
    throw error
  }
  return res.blob()
}

function announceImpersonationError(error: ApiError): void {
  if (!error.debug || typeof window === 'undefined') return

  console.error('[Apolos impersonation debug]', error.message, error.debug)
  window.dispatchEvent(new CustomEvent<ApiError>('apolos:impersonation-error', { detail: error }))
}

export const api = {
  get:    <T>(path: string)                  => request<T>(path),
  post:   <T>(path: string, body: unknown)   => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)   => request<T>(path, { method: 'POST',   body: JSON.stringify({ ...(body as object), _method: 'PATCH' }) }),
  put:    <T>(path: string, body: unknown)   => request<T>(path, { method: 'POST',   body: JSON.stringify({ ...(body as object), _method: 'PUT' }) }),
   delete: <T>(path: string, body?: unknown)  => request<T>(path, { method: 'POST', body: JSON.stringify({ ...(body as object), _method: 'DELETE' }) }),
  upload,
  download,
}
