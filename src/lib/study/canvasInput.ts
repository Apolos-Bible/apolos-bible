export function canvasPanButtons(
  tool: string,
  spaceHeld: boolean,
  isGuest: boolean,
  isMobile: boolean,
  hasTouchInput: boolean,
): number[] {
  if (tool === 'draw' || tool === 'erase') return spaceHeld ? [0, 1] : [1]
  return tool === 'hand' || isGuest || isMobile || hasTouchInput ? [0, 1] : [1]
}

export function canvasSelectionOnDrag(
  tool: string,
  isGuest: boolean,
  isMobile: boolean,
  hasTouchInput: boolean,
): boolean {
  return !hasTouchInput && !isMobile && !isGuest && tool === 'select'
}
