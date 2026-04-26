export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const err = error as { status?: number; message?: string }
  if (err.status === 401 || err.status === 403 || err.status === 419) return true

  const message = (err.message ?? '').toLowerCase()
  return message.includes('unauthorized')
    || message.includes('authentication')
    || message.includes('auth')
    || message.includes('login')
}
