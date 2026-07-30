import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'

const VERSE_ATTRIBUTE = 'data-selectable-verse-id'
const VERSE_SELECTOR = `[${VERSE_ATTRIBUTE}]`
const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="link"]',
  '[data-verse-selection-ignore]',
].join(',')
const DRAG_THRESHOLD_PX = 5
const AUTO_SCROLL_EDGE_PX = 48
const MAX_AUTO_SCROLL_PX = 18

interface SelectionActions {
  selectVerse: (id: string | null) => void
  selectVerseRangeTo: (id: string) => void
  toggleVerseSelection: (id: string) => void
}

interface DragState {
  pointerId: number
  originId: string
  startX: number
  startY: number
  clientX: number
  clientY: number
  lastId: string
  started: boolean
  previousUserSelect: string | null
}

interface UseVersePointerSelectionOptions extends SelectionActions {
  scrollRef: RefObject<HTMLElement | null>
}

export type VerseSelectionIntent = 'replace' | 'range' | 'toggle'

export function verseSelectionIntent(modifiers: {
  shiftKey: boolean
  metaKey: boolean
  ctrlKey: boolean
}): VerseSelectionIntent {
  if (modifiers.shiftKey) return 'range'
  if (modifiers.metaKey || modifiers.ctrlKey) return 'toggle'
  return 'replace'
}

/**
 * Desktop-style selection shared by the reader and comparison panel.
 *
 * Touch and pen gestures are intentionally left alone so vertical scrolling
 * remains native on mobile. Mouse dragging selects the contiguous verse range
 * and auto-scrolls when the pointer approaches the viewport edges.
 */
export function useVersePointerSelection({
  scrollRef,
  selectVerse,
  selectVerseRangeTo,
  toggleVerseSelection,
}: UseVersePointerSelectionOptions) {
  const dragRef = useRef<DragState | null>(null)
  const autoScrollFrameRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)
  const suppressClickTimerRef = useRef<number | null>(null)

  const verseRowFromTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) return null
    return target.closest<HTMLElement>(VERSE_SELECTOR)
  }, [])

  const verseIdAtPoint = useCallback((clientX: number, clientY: number) => {
    const scroller = scrollRef.current
    if (!scroller) return null

    const bounds = scroller.getBoundingClientRect()
    const x = Math.min(bounds.right - 1, Math.max(bounds.left + 1, clientX))
    const y = Math.min(bounds.bottom - 1, Math.max(bounds.top + 1, clientY))
    const directRow = document.elementFromPoint(x, y)?.closest<HTMLElement>(VERSE_SELECTOR)
    if (directRow && scroller.contains(directRow)) {
      return directRow.getAttribute(VERSE_ATTRIBUTE)
    }

    // Gaps, chapter headings and the space after the final row should still
    // behave like a continuous list while dragging.
    let nearestId: string | null = null
    let nearestDistance = Number.POSITIVE_INFINITY
    for (const row of scroller.querySelectorAll<HTMLElement>(VERSE_SELECTOR)) {
      const rect = row.getBoundingClientRect()
      const distance = Math.abs(rect.top + rect.height / 2 - y)
      if (distance >= nearestDistance) continue
      nearestDistance = distance
      nearestId = row.getAttribute(VERSE_ATTRIBUTE)
    }
    return nearestId
  }, [scrollRef])

  const updateDraggedRange = useCallback((drag: DragState) => {
    const verseId = verseIdAtPoint(drag.clientX, drag.clientY)
    if (!verseId || verseId === drag.lastId) return
    drag.lastId = verseId
    selectVerseRangeTo(verseId)
  }, [selectVerseRangeTo, verseIdAtPoint])

  const stopAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current)
      autoScrollFrameRef.current = null
    }
  }, [])

  const runAutoScroll = useCallback(() => {
    const drag = dragRef.current
    const scroller = scrollRef.current
    if (!drag?.started || !scroller) {
      autoScrollFrameRef.current = null
      return
    }

    const bounds = scroller.getBoundingClientRect()
    let delta = 0
    if (drag.clientY < bounds.top + AUTO_SCROLL_EDGE_PX) {
      const strength = (bounds.top + AUTO_SCROLL_EDGE_PX - drag.clientY) / AUTO_SCROLL_EDGE_PX
      delta = -Math.ceil(Math.min(1, strength) * MAX_AUTO_SCROLL_PX)
    } else if (drag.clientY > bounds.bottom - AUTO_SCROLL_EDGE_PX) {
      const strength = (drag.clientY - (bounds.bottom - AUTO_SCROLL_EDGE_PX)) / AUTO_SCROLL_EDGE_PX
      delta = Math.ceil(Math.min(1, strength) * MAX_AUTO_SCROLL_PX)
    }

    if (delta === 0) {
      autoScrollFrameRef.current = null
      return
    }

    const previousTop = scroller.scrollTop
    scroller.scrollTop += delta
    if (scroller.scrollTop !== previousTop) updateDraggedRange(drag)
    autoScrollFrameRef.current = requestAnimationFrame(runAutoScroll)
  }, [scrollRef, updateDraggedRange])

  const scheduleAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current === null) {
      autoScrollFrameRef.current = requestAnimationFrame(runAutoScroll)
    }
  }, [runAutoScroll])

  const restoreNativeSelection = useCallback((drag: DragState | null) => {
    if (drag && drag.previousUserSelect !== null) {
      document.body.style.userSelect = drag.previousUserSelect
      drag.previousUserSelect = null
    }
  }, [])

  const finishDrag = useCallback((suppressClick: boolean) => {
    const drag = dragRef.current
    dragRef.current = null
    stopAutoScroll()
    restoreNativeSelection(drag)

    if (!suppressClick || !drag?.started) return
    suppressClickRef.current = true
    if (suppressClickTimerRef.current !== null) {
      window.clearTimeout(suppressClickTimerRef.current)
    }
    // The click generated by pointerup runs in the same task. This fallback
    // clears the guard when a browser decides not to dispatch that click.
    suppressClickTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false
      suppressClickTimerRef.current = null
    }, 0)
  }, [restoreNativeSelection, stopAutoScroll])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      drag.clientX = event.clientX
      drag.clientY = event.clientY

      if (!drag.started) {
        const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
        if (distance < DRAG_THRESHOLD_PX) return
        drag.started = true
        drag.previousUserSelect = document.body.style.userSelect
        document.body.style.userSelect = 'none'
        window.getSelection()?.removeAllRanges()
        selectVerse(drag.originId)
      }

      event.preventDefault()
      updateDraggedRange(drag)
      scheduleAutoScroll()
    }

    const handlePointerUp = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      drag.clientX = event.clientX
      drag.clientY = event.clientY
      if (drag.started) updateDraggedRange(drag)
      finishDrag(true)
    }

    const handlePointerCancel = (event: PointerEvent) => {
      if (dragRef.current?.pointerId === event.pointerId) finishDrag(false)
    }
    const handleWindowBlur = () => finishDrag(false)

    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)
    window.addEventListener('blur', handleWindowBlur)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerCancel)
      window.removeEventListener('blur', handleWindowBlur)
      finishDrag(false)
      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current)
      }
    }
  }, [finishDrag, scheduleAutoScroll, selectVerse, updateDraggedRange])

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !event.isPrimary) return
    if (event.shiftKey || event.metaKey || event.ctrlKey) return

    const row = verseRowFromTarget(event.target)
    if (!row || !event.currentTarget.contains(row)) return

    const nestedInteractive = event.target instanceof Element
      ? event.target.closest<HTMLElement>(INTERACTIVE_SELECTOR)
      : null
    if (nestedInteractive && nestedInteractive !== row) return

    const originId = row.getAttribute(VERSE_ATTRIBUTE)
    if (!originId) return
    dragRef.current = {
      pointerId: event.pointerId,
      originId,
      startX: event.clientX,
      startY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      lastId: originId,
      started: false,
      previousUserSelect: null,
    }
  }, [verseRowFromTarget])

  const consumeSuppressedClick = useCallback(() => {
    if (!suppressClickRef.current) return false
    suppressClickRef.current = false
    return true
  }, [])

  const onVerseClick = useCallback((event: ReactMouseEvent, verseId: string) => {
    if (consumeSuppressedClick()) return
    const intent = verseSelectionIntent(event)
    if (intent === 'range') {
      selectVerseRangeTo(verseId)
      return
    }
    if (intent === 'toggle') {
      toggleVerseSelection(verseId)
      return
    }
    selectVerse(verseId)
  }, [
    consumeSuppressedClick,
    selectVerse,
    selectVerseRangeTo,
    toggleVerseSelection,
  ])

  const onBackgroundClick = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (verseRowFromTarget(event.target)) return
    if (
      event.target instanceof Element
      && event.target.closest(INTERACTIVE_SELECTOR)
    ) {
      return
    }
    if (consumeSuppressedClick()) return
    selectVerse(null)
  }, [consumeSuppressedClick, selectVerse, verseRowFromTarget])

  return {
    onPointerDown,
    onBackgroundClick,
    onVerseClick,
  }
}
