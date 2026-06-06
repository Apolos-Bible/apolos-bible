/**
 * Terse, Linear-style relative time ("ahora", "5 min", "3 h", "2 d", "4 sem",
 * "6 mes", "2 a"). Spanish abbreviations, no locale lib. Returns "—" for null.
 */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'

  const ms = Date.now() - then
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `${min} min`

  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h`

  const d = Math.floor(h / 24)
  if (d < 7) return `${d} d`

  const w = Math.floor(d / 7)
  if (w < 5) return `${w} sem`

  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo} mes`

  const y = Math.floor(d / 365)
  return `${y} a`
}
