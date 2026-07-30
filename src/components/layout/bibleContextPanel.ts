export type BibleContextPanelKind = 'notes' | 'commentary'

/**
 * Notes are a drill-down from the Bible reader, so they temporarily replace
 * commentary in the same panel. Closing notes reveals commentary again.
 */
export function activeBibleContextPanel(
  studyVerseId: string | null,
  commentaryOpen: boolean,
): BibleContextPanelKind | null {
  if (studyVerseId) return 'notes'
  if (commentaryOpen) return 'commentary'
  return null
}
