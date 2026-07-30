import { describe, expect, it } from 'vitest'
import { activeBibleContextPanel } from '../bibleContextPanel'

describe('activeBibleContextPanel', () => {
  it('shows notes over commentary while a verse is open', () => {
    expect(activeBibleContextPanel('genesis-1-1', true)).toBe('notes')
  })

  it('reveals commentary after notes close', () => {
    expect(activeBibleContextPanel(null, true)).toBe('commentary')
  })

  it('closes the region when neither view is active', () => {
    expect(activeBibleContextPanel(null, false)).toBeNull()
  })
})
