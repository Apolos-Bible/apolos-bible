/**
 * Drag-and-drop contract between the Bible tool panel and the study canvas.
 *
 * The panel writes a payload on `dragstart`; the canvas reads it on `drop` and
 * inserts nodes at the pointer position. `dataTransfer.getData()` is only
 * readable during `drop`, so `dragover` uses `hasVerseDrag()` (types only) to
 * decide whether to show the drop affordance.
 *
 * A module-level mirror of the payload backs up the DataTransfer: some
 * embedded webviews (Tauri) drop custom MIME types silently, and a same-window
 * drag never needs the real clipboard anyway.
 */

export const VERSE_DRAG_MIME = 'application/x-apolos-verses'

export interface VerseDragItem {
  verseId: number
  /** Human reference, e.g. "Juan 3:16". */
  reference: string
  version_id: number
  text: string
  verse: number
}

export interface VerseDragPayload {
  bookSlug: string
  bookName: string
  chapter: number
  items: VerseDragItem[]
}

let inFlight: VerseDragPayload | null = null

/** Attach a payload to a `dragstart` event. */
export function setVerseDrag(dt: DataTransfer, payload: VerseDragPayload) {
  inFlight = payload
  try {
    dt.setData(VERSE_DRAG_MIME, JSON.stringify(payload))
    dt.setData('text/plain', payload.items.map((i) => `${i.reference} — ${i.text}`).join('\n'))
  } catch {
    // Some webviews reject custom MIME types; the module mirror covers us.
  }
  dt.effectAllowed = 'copy'
}

/** True when the current drag carries verses (safe to call during `dragover`). */
export function hasVerseDrag(dt: DataTransfer | null): boolean {
  if (inFlight) return true
  if (!dt) return false
  return Array.from(dt.types).includes(VERSE_DRAG_MIME)
}

/** Read the payload during `drop`. Returns null when the drag isn't ours. */
export function readVerseDrag(dt: DataTransfer | null): VerseDragPayload | null {
  const raw = dt?.getData(VERSE_DRAG_MIME)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as VerseDragPayload
      if (Array.isArray(parsed?.items) && parsed.items.length > 0) return parsed
    } catch {
      // fall through to the mirror
    }
  }
  return inFlight
}

/** Clear the mirror on `dragend`, so a stale payload can't be re-dropped. */
export function endVerseDrag() {
  inFlight = null
}
