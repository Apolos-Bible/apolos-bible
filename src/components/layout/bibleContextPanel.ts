export type BibleContextPanelKind = 'notes' | 'insights' | 'comparison' | 'commentary'

/**
 * Notes are a drill-down from the Bible reader, so they temporarily replace
 * other Bible context. Verse insights (cross-references and similar verses)
 * are the next-most-specific view, followed by comparison and commentary.
 */
export function activeBibleContextPanel(
  studyVerseId: string | null,
  insightsOpen: boolean,
  comparisonOpen: boolean,
  commentaryOpen: boolean,
): BibleContextPanelKind | null {
  if (studyVerseId) return 'notes'
  if (insightsOpen) return 'insights'
  if (comparisonOpen) return 'comparison'
  if (commentaryOpen) return 'commentary'
  return null
}
