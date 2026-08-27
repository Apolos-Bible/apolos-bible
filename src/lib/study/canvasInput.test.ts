import { describe, expect, it } from 'vitest'
import { canvasPanButtons, canvasSelectionOnDrag } from './canvasInput'

describe('study canvas input', () => {
  it('pans with the primary pointer and disables marquee selection on iPad', () => {
    expect(canvasPanButtons('select', false, false, false, true)).toEqual([0, 1])
    expect(canvasSelectionOnDrag('select', false, false, true)).toBe(false)
  })

  it('keeps desktop mouse marquee selection', () => {
    expect(canvasPanButtons('select', false, false, false, false)).toEqual([1])
    expect(canvasSelectionOnDrag('select', false, false, false)).toBe(true)
  })
})
