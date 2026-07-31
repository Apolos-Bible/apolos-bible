import { describe, expect, it } from 'vitest'
import { canUseGoogleAnalytics, sanitizeAnalyticsPath } from './analytics'

describe('Google Analytics environment', () => {
  it('runs only on the apolos.bible web origin', () => {
    expect(canUseGoogleAnalytics('apolos.bible', false)).toBe(true)
    expect(canUseGoogleAnalytics('www.apolos.bible', false)).toBe(true)
    expect(canUseGoogleAnalytics('localhost', false)).toBe(false)
    expect(canUseGoogleAnalytics('apolos.bible', true)).toBe(false)
  })
})

describe('analytics page paths', () => {
  it('keeps public Bible routes', () => {
    expect(sanitizeAnalyticsPath('/es/bible/juan/3/16')).toBe('/es/bible/juan/3/16')
  })

  it('removes private and user-generated identifiers', () => {
    expect(sanitizeAnalyticsPath('/chat/42')).toBe('/chat/:conversationId')
    expect(sanitizeAnalyticsPath('/u/17')).toBe('/u/:userId')
    expect(sanitizeAnalyticsPath('/study/abc/private-token')).toBe('/study/:sessionId')
    expect(sanitizeAnalyticsPath('/mis-rutas/my-path/my-study')).toBe('/mis-rutas/:path/:study')
  })
})
