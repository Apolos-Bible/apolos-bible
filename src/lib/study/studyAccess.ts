import type { StudySession } from './studyApi'

export type StudyRole = 'host' | 'editor' | 'viewer'

export function studyRoleFor(session: StudySession | null, userId: number | null | undefined): StudyRole | null {
  if (!session || userId == null) return null
  if (Number(session.host_user_id) === Number(userId)) return 'host'
  const role = session.participants.find((participant) => Number(participant.id) === Number(userId))?.role
  return role === 'host' || role === 'editor' || role === 'viewer' ? role : null
}

export function canEditStudy(session: StudySession | null, userId: number | null | undefined, isGuest: boolean): boolean {
  if (isGuest) return false
  const role = studyRoleFor(session, userId)
  return role === 'host' || role === 'editor'
}

export function canManageStudy(session: StudySession | null, userId: number | null | undefined, isGuest: boolean): boolean {
  return !isGuest && studyRoleFor(session, userId) === 'host'
}
