import type { WorkspaceDropEdge } from '@/lib/store/useWorkspaceStore'

export type WorkspaceDropTarget = WorkspaceDropEdge | 'center'

type WorkspaceDropBounds = {
  left: number
  top: number
  width: number
  height: number
}

const EDGE_THRESHOLD = 0.3

/**
 * Resolves the destination represented by the pointer. Near an edge, the tab
 * creates a split in that direction; the central area joins the existing cell.
 */
export function resolveWorkspaceDropTarget(
  bounds: WorkspaceDropBounds,
  clientX: number,
  clientY: number,
): WorkspaceDropTarget {
  if (bounds.width <= 0 || bounds.height <= 0) return 'center'

  const x = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width))
  const y = Math.min(1, Math.max(0, (clientY - bounds.top) / bounds.height))
  const edges: Array<[WorkspaceDropEdge, number]> = [
    ['left', x],
    ['right', 1 - x],
    ['top', y],
    ['bottom', 1 - y],
  ]
  const [edge, distance] = edges.reduce((closest, candidate) =>
    candidate[1] < closest[1] ? candidate : closest)

  return distance <= EDGE_THRESHOLD ? edge : 'center'
}
