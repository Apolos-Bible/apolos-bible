import { describe, it, expect } from 'vitest'
import { formatVerseRanges } from '../formatVerseRanges'

describe('formatVerseRanges', () => {
  it('returns an empty string for no verses', () => {
    expect(formatVerseRanges([])).toBe('')
  })

  it('renders a single verse', () => {
    expect(formatVerseRanges([16])).toBe('16')
  })

  it('collapses a contiguous run', () => {
    expect(formatVerseRanges([16, 17, 18, 19])).toBe('16-19')
  })

  it('lists a pair rather than hyphenating it', () => {
    expect(formatVerseRanges([16, 17])).toBe('16, 17')
  })

  it('separates gaps', () => {
    expect(formatVerseRanges([16, 17, 18, 20])).toBe('16-18, 20')
  })

  it('handles several runs and lone verses', () => {
    expect(formatVerseRanges([1, 2, 3, 7, 10, 11, 12])).toBe('1-3, 7, 10-12')
  })

  it('sorts and dedupes unordered input', () => {
    expect(formatVerseRanges([18, 16, 17, 16])).toBe('16-18')
  })
})
