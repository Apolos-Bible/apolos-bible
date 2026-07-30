import { describe, expect, it } from 'vitest'
import { activeBibleContextPanel } from '../bibleContextPanel'

describe('activeBibleContextPanel', () => {
  it('shows notes over comparison and commentary while a verse is open', () => {
    expect(activeBibleContextPanel('genesis-1-1', true, true, true)).toBe('notes')
  })

  it('shows comparison over commentary', () => {
    expect(activeBibleContextPanel(null, false, true, true)).toBe('comparison')
  })

  it('shows verse insights over comparison and commentary', () => {
    expect(activeBibleContextPanel(null, true, true, true)).toBe('insights')
  })

  it('reveals commentary after contextual views close', () => {
    expect(activeBibleContextPanel(null, false, false, true)).toBe('commentary')
  })

  it('closes the region when neither view is active', () => {
    expect(activeBibleContextPanel(null, false, false, false)).toBeNull()
  })
})
