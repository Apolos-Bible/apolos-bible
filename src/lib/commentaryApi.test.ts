import { describe, expect, it } from 'vitest'
import { commentaryExcerpt } from './commentaryApi'

describe('commentaryExcerpt', () => {
  it('turns commentary HTML into the first three sentences', () => {
    const html = '<h2>Génesis 6</h2><p>Primera oración. Segunda oración.</p><p>Tercera oración. Cuarta oración.</p>'

    expect(commentaryExcerpt(html)).toBe('Primera oración. Segunda oración. Tercera oración.')
  })
})
