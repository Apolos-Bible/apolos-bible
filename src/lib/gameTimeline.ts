export type TimelineDropPosition = 'before' | 'after'

export function moveTimelineItem(
  order: number[],
  itemId: number,
  targetId: number,
  position: TimelineDropPosition,
): number[] {
  if (itemId === targetId || !order.includes(itemId) || !order.includes(targetId)) return order

  const next = order.filter((id) => id !== itemId)
  const targetIndex = next.indexOf(targetId)
  next.splice(targetIndex + (position === 'after' ? 1 : 0), 0, itemId)
  return next
}

export function moveTimelineItemByOffset(order: number[], itemId: number, offset: -1 | 1): number[] {
  const currentIndex = order.indexOf(itemId)
  const targetIndex = currentIndex + offset
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= order.length) return order

  const next = [...order]
  ;[next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]]
  return next
}
