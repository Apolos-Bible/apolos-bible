/**
 * Paths have no cover art, so their "art" is a gradient derived from the slug:
 * the same path always looks the same, everywhere it appears.
 */
export function hueOf(slug: string): number {
  let hash = 0
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) % 360
  return hash
}
