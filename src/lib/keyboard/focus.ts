const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

/** Tabbable descendants of `root`, in document order, skipping hidden ones. */
export function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false
    if (el.closest('[inert]')) return false
    // offsetParent is null for display:none (and for position:fixed, hence the
    // rect fallback).
    return el.offsetParent != null || el.getBoundingClientRect().height > 0
  })
}

/**
 * Focus a node that may not exist yet — the study panel and the mobile drawers
 * mount a frame or two after the state change that asks for the focus. Retries
 * on animation frames, then gives up quietly.
 */
export function focusWhenReady(selector: string, options?: { timeout?: number }) {
  const timeout = options?.timeout ?? 700
  const start = Date.now()

  const tick = () => {
    const el = document.querySelector<HTMLElement>(selector)
    if (el) {
      el.focus()
      return
    }
    if (Date.now() - start < timeout) requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}

/** Does `el` currently hold focus (or contain the focused node)? */
export function containsFocus(el: HTMLElement | null): boolean {
  return el != null && el.contains(document.activeElement)
}

/**
 * True when focus is somewhere "neutral" — the body, or inside `within`. Used
 * before programmatically moving focus, so we never yank it out of a text field
 * the user is typing in.
 */
export function isFocusIdle(within?: HTMLElement | null): boolean {
  const active = document.activeElement
  if (!active || active === document.body) return true
  if (within && within.contains(active)) return true
  return false
}
