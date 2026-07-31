import { describe, expect, it } from 'vitest'
import { moveTimelineItem, moveTimelineItemByOffset } from './gameTimeline'

describe('game timeline ordering', () => {
  it('moves an item before or after another item', () => {
    expect(moveTimelineItem([0, 1, 2, 3], 3, 1, 'before')).toEqual([0, 3, 1, 2])
    expect(moveTimelineItem([0, 1, 2, 3], 1, 3, 'after')).toEqual([0, 2, 3, 1])
  })

  it('moves an item one position for touch and keyboard controls', () => {
    expect(moveTimelineItemByOffset([0, 1, 2, 3], 2, -1)).toEqual([0, 2, 1, 3])
    expect(moveTimelineItemByOffset([0, 1, 2, 3], 1, 1)).toEqual([0, 2, 1, 3])
  })

  it('keeps the order unchanged at its boundaries', () => {
    const order = [0, 1, 2, 3]
    expect(moveTimelineItemByOffset(order, 0, -1)).toBe(order)
    expect(moveTimelineItemByOffset(order, 3, 1)).toBe(order)
  })
})
