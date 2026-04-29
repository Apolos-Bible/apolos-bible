/** Strip diacritics and lowercase — a=á, e=é, n=ñ, o=ó, etc. */
export function normalizeText(s: string): string {
  // NFD decomposes accented chars into base + combining mark; we then strip the marks
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
