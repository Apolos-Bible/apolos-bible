import type { StudySession } from './studyApi'

/** The API orders by recent activity, so the first match is the best resume target. */
export function findActiveGuidedSession(
  sessions: StudySession[],
  guidedStudySlug: string,
): StudySession | null {
  return sessions.find(
    (session) => session.status === 'active' && session.guided_study?.slug === guidedStudySlug,
  ) ?? null
}
