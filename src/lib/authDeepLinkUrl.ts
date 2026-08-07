export type AuthProvider = 'google' | 'youversion'

interface BridgeDeepLinkInput {
  provider: AuthProvider
  error?: string | null
  dataExchange?: string | null
  fragment?: string
}

export function buildAuthBridgeDeepLink({
  provider,
  error,
  dataExchange,
  fragment = '',
}: BridgeDeepLinkInput): string {
  const params = new URLSearchParams({ provider })
  if (error) params.set('error', error)
  if (dataExchange) params.set('data_exchange', dataExchange)

  // Fragments are not reliably forwarded when a browser hands a custom URL
  // scheme to the OS. This custom URL is local and never reaches an HTTP server.
  const fragmentParams = new URLSearchParams(fragment.replace(/^#/, ''))
  const token = fragmentParams.get('token')
  if (token) params.set('token', token)

  return `tulia://auth/finish?${params.toString()}`
}

export function authDeepLinkTarget(url: string): string | null {
  if (!url) return null

  const match = url.match(/^tulia:\/*([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/i)
  if (!match) return null

  const [, rawHost, rawPath, search = '', legacyHash = ''] = match
  const host = rawHost.toLowerCase()
  const path = rawPath.toLowerCase()
  const isAuthFinish =
    (host === 'auth' && (path === '/finish' || path === '')) ||
    (host === '' && /^\/*auth\/finish\/?$/.test(path))

  if (!isAuthFinish) return null

  const params = new URLSearchParams(search.replace(/^\?/, ''))
  const provider: AuthProvider = params.get('provider') === 'youversion' ? 'youversion' : 'google'
  const token = params.get('token')
  params.delete('provider')
  params.delete('token')

  const remainingSearch = params.size > 0 ? `?${params.toString()}` : ''
  const hash = token ? `#token=${encodeURIComponent(token)}` : legacyHash

  return `/auth/${provider}/finish${remainingSearch}${hash}`
}
