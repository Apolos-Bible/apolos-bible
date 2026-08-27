import { describe, expect, it } from 'vitest'
import { mapComparisonScrollTop } from './compareScroll'

describe('comparison scroll mapping', () => {
  const source = [{ verse: 1, top: 0 }, { verse: 2, top: 100 }, { verse: 3, top: 200 }]
  const target = [{ verse: 1, top: 0 }, { verse: 2, top: 160 }, { verse: 3, top: 240 }]

  it('interpolates continuously between verses of different heights', () => {
    const before = mapComparisonScrollTop(64, 100, 300, source, 100, 400, target)
    const after = mapComparisonScrollTop(66, 100, 300, source, 100, 400, target)
    expect(after).toBeGreaterThan(before)
    expect(after - before).toBeLessThan(10)
  })

  it('keeps the beginning and end aligned', () => {
    expect(mapComparisonScrollTop(0, 100, 300, source, 100, 400, target)).toBe(0)
    expect(mapComparisonScrollTop(300, 100, 300, source, 100, 400, target)).toBe(400)
  })

  it('falls back to proportional scrolling when a verse is absent', () => {
    expect(mapComparisonScrollTop(150, 100, 300, [{ verse: 9, top: 0 }], 100, 400, target)).toBe(200)
  })
})
