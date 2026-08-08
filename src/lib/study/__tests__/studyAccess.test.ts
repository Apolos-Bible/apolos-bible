import { describe, expect, it } from 'vitest'
import type { StudySession } from '../studyApi'
import { canEditStudy, canManageStudy, studyRoleFor } from '../studyAccess'

const session = {
  id: 'study-1', host_user_id: 1,
  participants: [
    { id: 1, role: 'host' }, { id: 2, role: 'editor' }, { id: 3, role: 'viewer' },
  ],
} as StudySession

describe('[STUDY-ACCESS-01] study role policy', () => {
  it.each([[1, 'host'], [2, 'editor'], [3, 'viewer'], [99, null]] as const)('resolves user %s as %s', (id, role) => {
    expect(studyRoleFor(session, id)).toBe(role)
  })

  it('allows host and editor mutations but denies viewer, guest and unknown users', () => {
    expect(canEditStudy(session, 1, false)).toBe(true)
    expect(canEditStudy(session, 2, false)).toBe(true)
    expect(canEditStudy(session, 3, false)).toBe(false)
    expect(canEditStudy(session, 2, true)).toBe(false)
    expect(canEditStudy(session, 99, false)).toBe(false)
  })

  it('reserves session management for the host', () => {
    expect(canManageStudy(session, 1, false)).toBe(true)
    expect(canManageStudy(session, 2, false)).toBe(false)
    expect(canManageStudy(session, 3, false)).toBe(false)
  })
})
