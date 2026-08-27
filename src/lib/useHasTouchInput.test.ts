import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectTouchInput } from './useHasTouchInput'

describe('touch input detection', () => {
  afterEach(() => vi.restoreAllMocks())

  it('detects an iPad by its touch points even in a desktop-sized viewport', () => {
    vi.spyOn(navigator, 'maxTouchPoints', 'get').mockReturnValue(5)
    expect(detectTouchInput()).toBe(true)
  })

  it('detects coarse pointers and leaves mouse-only devices unchanged', () => {
    vi.spyOn(navigator, 'maxTouchPoints', 'get').mockReturnValue(0)
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    expect(detectTouchInput()).toBe(true)
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
    expect(detectTouchInput()).toBe(false)
  })
})
