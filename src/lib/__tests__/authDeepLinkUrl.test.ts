import { authDeepLinkTarget, buildAuthBridgeDeepLink } from '@/lib/authDeepLinkUrl'

describe('OAuth deep-link handoff', () => {
  it('moves the browser fragment token into the local custom-scheme query', () => {
    expect(buildAuthBridgeDeepLink({
      provider: 'google',
      fragment: '#token=17%7Csecret-token',
    })).toBe('tulia://auth/finish?provider=google&token=17%7Csecret-token')
  })

  it('restores a query token to the SPA fragment consumed by the finish route', () => {
    expect(authDeepLinkTarget(
      'tulia://auth/finish?provider=google&token=17%7Csecret-token',
    )).toBe('/auth/google/finish#token=17%7Csecret-token')
  })

  it('preserves YouVersion result metadata', () => {
    expect(authDeepLinkTarget(
      'tulia://auth/finish?provider=youversion&data_exchange=cancelled&token=abc',
    )).toBe('/auth/youversion/finish?data_exchange=cancelled#token=abc')
  })

  it('accepts legacy fragment-based links during the migration', () => {
    expect(authDeepLinkTarget(
      'tulia://auth/finish?provider=google#token=legacy',
    )).toBe('/auth/google/finish#token=legacy')
  })

  it('rejects unrelated custom-scheme paths', () => {
    expect(authDeepLinkTarget('tulia://settings/profile?token=secret')).toBeNull()
  })
})
