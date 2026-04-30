const BASE = import.meta.env.VITE_API_URL ?? 'https://verbum.test'

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
    const error = new Error(err.message ?? res.statusText) as Error & { status: number }
    error.status = res.status
    throw error
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  get:    <T>(path: string)                  => request<T>(path),
  post:   <T>(path: string, body: unknown)   => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)   => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)                  => request<T>(path, { method: 'DELETE' }),
}
