import { describe, expect, it } from 'vitest'
import {
  eventToStep,
  formatBinding,
  parseBinding,
  sequenceIsPrefix,
  sequenceMatches,
  stepMatches,
} from './binding'

function ev(key: string, mods: Partial<{ ctrl: boolean; meta: boolean; alt: boolean; shift: boolean }> = {}) {
  return eventToStep({
    key,
    ctrlKey: mods.ctrl ?? false,
    metaKey: mods.meta ?? false,
    altKey: mods.alt ?? false,
    shiftKey: mods.shift ?? false,
  } as KeyboardEvent)
}

describe('parseBinding', () => {
  it('parses a single key', () => {
    expect(parseBinding('j')).toEqual([{ key: 'j', mod: false, ctrl: false, meta: false, alt: false, shift: false }])
  })

  it('parses modifiers', () => {
    expect(parseBinding('mod+shift+z')[0]).toEqual({
      key: 'z',
      mod: true,
      ctrl: false,
      meta: false,
      alt: false,
      shift: true,
    })
  })

  it('parses a sequence into steps', () => {
    const steps = parseBinding('g p')
    expect(steps).toHaveLength(2)
    expect(steps.map((s) => s.key)).toEqual(['g', 'p'])
  })

  it('normalizes aliases and casing', () => {
    expect(parseBinding('Esc')[0].key).toBe('escape')
    expect(parseBinding('ArrowDown')[0].key).toBe('arrowdown')
    expect(parseBinding('Up')[0].key).toBe('arrowup')
  })
})

describe('stepMatches', () => {
  it('resolves mod to Meta on macOS and Ctrl elsewhere', () => {
    const [step] = parseBinding('mod+k')
    expect(stepMatches(step, ev('k', { meta: true }), true)).toBe(true)
    expect(stepMatches(step, ev('k', { ctrl: true }), true)).toBe(false)
    expect(stepMatches(step, ev('k', { ctrl: true }), false)).toBe(true)
    expect(stepMatches(step, ev('k', { meta: true }), false)).toBe(false)
  })

  it('requires a bare key to have no modifiers', () => {
    const [step] = parseBinding('j')
    expect(stepMatches(step, ev('j'), false)).toBe(true)
    expect(stepMatches(step, ev('j', { ctrl: true }), false)).toBe(false)
    expect(stepMatches(step, ev('j', { alt: true }), false)).toBe(false)
  })

  it('ignores Shift for printable glyphs that need it', () => {
    const [step] = parseBinding('?')
    expect(stepMatches(step, ev('?', { shift: true }), false)).toBe(true)
  })

  it('honours an explicit shift requirement', () => {
    const [step] = parseBinding('shift+f10')
    expect(stepMatches(step, ev('F10', { shift: true }), false)).toBe(true)
    expect(stepMatches(step, ev('F10'), false)).toBe(false)
  })

  it('normalizes case but keeps Shift significant for letters', () => {
    const [bare] = parseBinding('j')
    const [shifted] = parseBinding('shift+j')

    // Shift+J must not fire the bare binding, or "shift+j" could never have its
    // own meaning (extend selection vs move).
    expect(stepMatches(bare, ev('J', { shift: true }), false)).toBe(false)
    expect(stepMatches(shifted, ev('J', { shift: true }), false)).toBe(true)
    expect(stepMatches(shifted, ev('j'), false)).toBe(false)
  })

  it('ignores Shift for punctuation, whose unshifted glyph is layout-dependent', () => {
    expect(stepMatches(parseBinding('?')[0], ev('?', { shift: true }), false)).toBe(true)
    expect(stepMatches(parseBinding('/')[0], ev('/'), false)).toBe(true)
    expect(stepMatches(parseBinding('.')[0], ev('.', { shift: true }), false)).toBe(true)
  })

  it('keeps Shift significant for named keys', () => {
    expect(stepMatches(parseBinding('escape')[0], ev('Escape', { shift: true }), false)).toBe(false)
    expect(stepMatches(parseBinding('escape')[0], ev('Escape'), false)).toBe(true)
  })
})

describe('sequenceMatches', () => {
  const gp = parseBinding('g p')

  it('matches the tail of the buffer', () => {
    expect(sequenceMatches(gp, [ev('x'), ev('g'), ev('p')], false)).toBe(true)
  })

  it('rejects an interrupted sequence', () => {
    expect(sequenceMatches(gp, [ev('g'), ev('x'), ev('p')], false)).toBe(false)
  })

  it('rejects a buffer shorter than the sequence', () => {
    expect(sequenceMatches(gp, [ev('g')], false)).toBe(false)
  })

  it('matches a single-step binding on the last key', () => {
    expect(sequenceMatches(parseBinding('j'), [ev('g'), ev('j')], false)).toBe(true)
  })
})

describe('sequenceIsPrefix', () => {
  const gp = parseBinding('g p')

  it('arms after the first step', () => {
    expect(sequenceIsPrefix(gp, [ev('g')], false)).toBe(true)
  })

  it('is not a prefix once complete', () => {
    expect(sequenceIsPrefix(gp, [ev('g'), ev('p')], false)).toBe(false)
  })

  it('rejects a wrong first step', () => {
    expect(sequenceIsPrefix(gp, [ev('q')], false)).toBe(false)
  })
})

describe('formatBinding', () => {
  it('renders platform modifiers', () => {
    expect(formatBinding('mod+k', true)).toEqual([['⌘', 'K']])
    expect(formatBinding('mod+k', false)).toEqual([['Ctrl', 'K']])
  })

  it('renders a sequence as one group per step', () => {
    expect(formatBinding('g p', false)).toEqual([['G'], ['P']])
  })

  it('renders named keys as symbols', () => {
    expect(formatBinding('arrowleft', false)).toEqual([['←']])
    expect(formatBinding('escape', false)).toEqual([['Esc']])
    expect(formatBinding('shift+f10', false)).toEqual([['Shift', 'F10']])
  })
})
