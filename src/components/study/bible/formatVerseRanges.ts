/**
 * Collapse verse numbers into a compact reference tail: [16,17,18,20] → "16-18, 20".
 * Used to name a selection concretely ("Juan 3:16-18") instead of only counting it.
 */
export function formatVerseRanges(numbers: number[]): string {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b)
  if (sorted.length === 0) return ''

  const parts: string[] = []
  let start = sorted[0]
  let previous = start

  const flush = () => {
    if (start === previous) parts.push(String(start))
    else if (previous === start + 1) parts.push(`${start}, ${previous}`)
    else parts.push(`${start}-${previous}`)
  }

  for (const n of sorted.slice(1)) {
    if (n === previous + 1) {
      previous = n
      continue
    }
    flush()
    start = n
    previous = n
  }
  flush()

  return parts.join(', ')
}
