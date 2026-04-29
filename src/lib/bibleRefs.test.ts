import { describe, it, expect } from 'vitest'
import { segmentText } from './bibleRefs'

describe('placeholder', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})

describe('segmentText', () => {
  it('returns single text segment when no reference found', () => {
    expect(segmentText('hello world')).toEqual([
      { kind: 'text', value: 'hello world' },
    ])
  })

  it('returns empty array for empty string', () => {
    expect(segmentText('')).toEqual([])
  })

  it('detects English reference with chapter and verse', () => {
    const segs = segmentText('check out John 3:16 for more')
    expect(segs).toHaveLength(3)
    expect(segs[0]).toEqual({ kind: 'text', value: 'check out ' })
    expect(segs[1]).toMatchObject({ kind: 'ref', slug: 'john', chapter: 3, verse: 16, endVerse: null, versionAbbr: null })
    expect(segs[2]).toEqual({ kind: 'text', value: ' for more' })
  })

  it('detects Spanish reference', () => {
    const segs = segmentText('lee Juan 3:16')
    expect(segs[1]).toMatchObject({ kind: 'ref', slug: 'john', chapter: 3, verse: 16 })
  })

  it('detects reference without space between book and chapter (john3:16)', () => {
    const segs = segmentText('john3:16')
    expect(segs[0]).toMatchObject({ kind: 'ref', slug: 'john', chapter: 3, verse: 16 })
  })

  it('detects chapter-only reference', () => {
    const segs = segmentText('Matthew 14')
    expect(segs[0]).toMatchObject({ kind: 'ref', slug: 'matthew', chapter: 14, verse: null, endVerse: null })
  })

  it('detects verse range', () => {
    const segs = segmentText('Juan 3:16-18')
    expect(segs[0]).toMatchObject({ kind: 'ref', slug: 'john', chapter: 3, verse: 16, endVerse: 18 })
  })

  it('captures version prefix', () => {
    const segs = segmentText('NIV John 3:16')
    expect(segs[0]).toMatchObject({ kind: 'ref', slug: 'john', chapter: 3, verse: 16, versionAbbr: 'NIV' })
  })

  it('captures version prefix with digit (RV60)', () => {
    const segs = segmentText('RV60 Juan 3:16')
    expect(segs[0]).toMatchObject({ kind: 'ref', slug: 'john', chapter: 3, verse: 16, versionAbbr: 'RV60' })
  })

  it('detects numbered book (1 Corinthians)', () => {
    const segs = segmentText('1 Corinthians 13:4')
    expect(segs[0]).toMatchObject({ kind: 'ref', slug: '1-corinthians', chapter: 13, verse: 4 })
  })

  it('detects numbered book without space (1cor13:4)', () => {
    const segs = segmentText('1cor13:4')
    expect(segs[0]).toMatchObject({ kind: 'ref', slug: '1-corinthians', chapter: 13, verse: 4 })
  })

  it('detects multiple references in one message', () => {
    const segs = segmentText('Read John 3:16 and Romans 8:1')
    const refs = segs.filter(s => s.kind === 'ref')
    expect(refs).toHaveLength(2)
    expect(refs[0]).toMatchObject({ slug: 'john', chapter: 3, verse: 16 })
    expect(refs[1]).toMatchObject({ slug: 'romans', chapter: 8, verse: 1 })
  })

  it('preserves raw matched text', () => {
    const segs = segmentText('Juan 3:16')
    expect(segs[0]).toMatchObject({ kind: 'ref', raw: 'Juan 3:16' })
  })

  it('detects Spanish abbreviated reference (Mat 14)', () => {
    const segs = segmentText('Mat 14')
    expect(segs[0]).toMatchObject({ kind: 'ref', slug: 'matthew', chapter: 14 })
  })
})
