import { isMac as platformIsMac } from '@/lib/platform'

/**
 * Binding grammar
 * ───────────────
 *   "mod+k"          single chord — `mod` is ⌘ on macOS, Ctrl elsewhere
 *   "g p"            sequence — press G, then P (Linear-style chord)
 *   "shift+f10"      explicit modifier
 *   "?"              printable key that happens to need Shift; declare the
 *                    glyph, not the physical key — matching ignores Shift
 *                    unless the binding asks for it explicitly.
 *
 * Everything is normalized to lowercase. `KeyboardEvent.key` is the source of
 * truth (not `code`) so layouts that move punctuation still work.
 */

export interface KeyStep {
  key: string
  /** `mod+` — resolved to Meta on macOS, Ctrl elsewhere, at match time. */
  mod: boolean
  ctrl: boolean
  meta: boolean
  alt: boolean
  shift: boolean
}

export interface EventStep {
  key: string
  ctrl: boolean
  meta: boolean
  alt: boolean
  shift: boolean
}

const KEY_ALIASES: Record<string, string> = {
  ' ': 'space',
  spacebar: 'space',
  esc: 'escape',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  return: 'enter',
  del: 'delete',
  plus: '+',
}

/** Human-facing chip labels. Anything absent falls through uppercased. */
const KEY_LABELS: Record<string, string> = {
  escape: 'Esc',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  enter: '↵',
  space: '␣',
  tab: 'Tab',
  backspace: '⌫',
  delete: 'Del',
  contextmenu: '▤',
  home: 'Home',
  end: 'End',
  pageup: 'PgUp',
  pagedown: 'PgDn',
}

export function normalizeKey(key: string): string {
  const lower = key.toLowerCase()
  return KEY_ALIASES[lower] ?? lower
}

export function parseStep(step: string): KeyStep {
  const parts = step.split('+').filter((part) => part.length > 0)
  // A trailing "+" (as in the literal plus key) leaves an empty tail; the
  // filter above drops it, so re-add the glyph as the key.
  const tokens = parts.length > 0 ? parts : ['+']

  const parsed: KeyStep = { key: '', mod: false, ctrl: false, meta: false, alt: false, shift: false }

  tokens.forEach((token, i) => {
    const t = token.toLowerCase()
    const isLast = i === tokens.length - 1
    if (!isLast) {
      if (t === 'mod') parsed.mod = true
      else if (t === 'ctrl' || t === 'control') parsed.ctrl = true
      else if (t === 'meta' || t === 'cmd' || t === 'command') parsed.meta = true
      else if (t === 'alt' || t === 'option') parsed.alt = true
      else if (t === 'shift') parsed.shift = true
      return
    }
    parsed.key = normalizeKey(token)
  })

  return parsed
}

export function parseBinding(binding: string): KeyStep[] {
  return binding.trim().split(/\s+/).filter(Boolean).map(parseStep)
}

export function eventToStep(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>): EventStep {
  return {
    key: normalizeKey(e.key),
    ctrl: e.ctrlKey,
    meta: e.metaKey,
    alt: e.altKey,
    shift: e.shiftKey,
  }
}

/**
 * Can this key be typed only by holding Shift? For punctuation we can't know
 * (it's layout-dependent), so Shift is ignored — "?" arrives as "?" whether or
 * not the layout needed Shift for it. For letters and digits we *do* know the
 * unshifted glyph, so Shift is significant and "shift+j" stays distinct from
 * "j".
 */
function shiftIsAmbiguous(key: string): boolean {
  return key.length === 1 && !/^[a-z0-9]$/.test(key)
}

export function stepMatches(step: KeyStep, ev: EventStep, isMac = platformIsMac): boolean {
  if (step.key !== ev.key) return false

  const wantCtrl = step.ctrl || (step.mod && !isMac)
  const wantMeta = step.meta || (step.mod && isMac)

  if (ev.ctrl !== wantCtrl) return false
  if (ev.meta !== wantMeta) return false
  if (ev.alt !== step.alt) return false

  if (step.shift) {
    if (!ev.shift) return false
  } else if (!shiftIsAmbiguous(step.key) && ev.shift) {
    return false
  }

  return true
}

/**
 * Does `events` (the recent keystroke buffer, oldest first) end with the full
 * `steps` sequence?
 */
export function sequenceMatches(steps: KeyStep[], events: EventStep[], isMac = platformIsMac): boolean {
  if (steps.length === 0 || events.length < steps.length) return false
  const tail = events.slice(events.length - steps.length)
  return steps.every((step, i) => stepMatches(step, tail[i], isMac))
}

/**
 * Is the whole buffer a strict prefix of `steps`? Decides whether to keep
 * buffering after a partial chord (the "g" of "g p"). The buffer is only ever
 * retained while it is a live prefix, so comparing from index 0 is correct.
 */
export function sequenceIsPrefix(steps: KeyStep[], events: EventStep[], isMac = platformIsMac): boolean {
  if (events.length === 0 || events.length >= steps.length) return false
  return events.every((ev, i) => stepMatches(steps[i], ev, isMac))
}

export function formatStep(step: KeyStep, isMac = platformIsMac): string[] {
  const chips: string[] = []
  if (step.mod) chips.push(isMac ? '⌘' : 'Ctrl')
  if (step.ctrl) chips.push(isMac ? '⌃' : 'Ctrl')
  if (step.meta && !step.mod) chips.push(isMac ? '⌘' : 'Meta')
  if (step.alt) chips.push(isMac ? '⌥' : 'Alt')
  if (step.shift) chips.push(isMac ? '⇧' : 'Shift')

  const label = KEY_LABELS[step.key] ?? (step.key.length === 1 ? step.key.toUpperCase() : step.key.replace(/^f(\d+)$/, 'F$1'))
  chips.push(label)
  return chips
}

/**
 * Chips for a whole binding. Sequences return one group per step so the UI can
 * render "G → P" instead of a single unreadable blob.
 */
export function formatBinding(binding: string, isMac = platformIsMac): string[][] {
  return parseBinding(binding).map((step) => formatStep(step, isMac))
}
