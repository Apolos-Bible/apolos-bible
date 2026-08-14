import { describe, expect, it } from 'vitest'
import { pathCoverGradient } from './PathCover'

describe('pathCoverGradient', () => {
  it('derives the cover from the color selected by the author', () => {
    expect(pathCoverGradient('#668f32', 'anything'))
      .not.toBe(pathCoverGradient('#27648a', 'anything'))
  })

  it('keeps a deterministic slug-based fallback for legacy routes', () => {
    const first = pathCoverGradient(null, 'ruta-antigua')
    expect(first).toBe(pathCoverGradient(null, 'ruta-antigua'))
    expect(first).not.toBe(pathCoverGradient(null, 'otra-ruta'))
  })
})
