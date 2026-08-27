export interface VerseScrollAnchor {
  verse: number
  top: number
}

/** Maps the visual reading position continuously between translations whose
 * verse blocks have different heights. */
export function mapComparisonScrollTop(
  sourceScrollTop: number,
  sourceViewport: number,
  sourceRange: number,
  sourceAnchors: VerseScrollAnchor[],
  targetViewport: number,
  targetRange: number,
  targetAnchors: VerseScrollAnchor[],
): number {
  if (sourceRange <= 0 || targetRange <= 0) return 0
  if (sourceScrollTop <= 1) return 0
  if (sourceScrollTop >= sourceRange - 1) return targetRange

  const sourcePosition = sourceScrollTop + sourceViewport * 0.35
  let index = sourceAnchors.findLastIndex((anchor) => anchor.top <= sourcePosition)
  if (index < 0) index = 0
  const current = sourceAnchors[index]
  if (!current) return (sourceScrollTop / sourceRange) * targetRange

  const targetIndex = targetAnchors.findIndex((anchor) => anchor.verse === current.verse)
  const targetCurrent = targetAnchors[targetIndex]
  if (!targetCurrent) return (sourceScrollTop / sourceRange) * targetRange

  const sourceNext = sourceAnchors[index + 1]
  const targetNext = targetAnchors[targetIndex + 1]
  const progress = sourceNext && targetNext
    ? Math.min(1, Math.max(0, (sourcePosition - current.top) / Math.max(1, sourceNext.top - current.top)))
    : 0
  const targetPosition = targetNext
    ? targetCurrent.top + (targetNext.top - targetCurrent.top) * progress
    : targetCurrent.top

  return Math.min(targetRange, Math.max(0, targetPosition - targetViewport * 0.35))
}
