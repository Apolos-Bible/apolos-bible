import { describe, expect, it } from 'vitest'
import { resolveWorkspaceDropTarget } from '../workspaceDropTarget'

const bounds = { left: 100, top: 50, width: 1000, height: 600 }

describe('resolveWorkspaceDropTarget', () => {
  it.each([
    ['left', 150, 350],
    ['right', 1050, 350],
    ['top', 600, 80],
    ['bottom', 600, 620],
    ['center', 600, 350],
  ] as const)('resolves the %s preview from the pointer position', (target, x, y) => {
    expect(resolveWorkspaceDropTarget(bounds, x, y)).toBe(target)
  })

  it('chooses the closest edge when the pointer is in a corner', () => {
    expect(resolveWorkspaceDropTarget(bounds, 120, 170)).toBe('left')
    expect(resolveWorkspaceDropTarget(bounds, 300, 60)).toBe('top')
  })
})
