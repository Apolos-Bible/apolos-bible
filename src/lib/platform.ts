export const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
export const modKey = isMac ? '⌘' : 'Ctrl+'
/** Same shape as `modKey`: macOS uses the glyph alone, everywhere else needs the "+". */
export const shiftKey = isMac ? '⇧' : 'Shift+'
