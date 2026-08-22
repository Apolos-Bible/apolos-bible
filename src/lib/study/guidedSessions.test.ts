import { describe, expect, it } from 'vitest'
import type { StudySession } from './studyApi'
import { findActiveGuidedSession } from './guidedSessions'

function session(id: string, slug: string | null, status: 'active' | 'ended'): StudySession {
  return {
    id,
    type: 'free',
    anchor_ref: null,
    guided_study: slug ? { slug, title: slug, step_count: 3 } : null,
    title: id,
    host_user_id: 1,
    conversation_id: null,
    status,
    thumbnail_url: null,
    last_activity_at: '2026-08-22T10:00:00Z',
    ended_at: status === 'ended' ? '2026-08-22T10:00:00Z' : null,
    created_at: '2026-08-22T09:00:00Z',
    updated_at: '2026-08-22T10:00:00Z',
    participants: [],
    pending_invitation_count: 0,
    host: null,
  }
}

describe('findActiveGuidedSession', () => {
  it('returns the latest active session for the selected guided study', () => {
    const sessions = [
      session('latest', 'study-a', 'active'),
      session('ended', 'study-a', 'ended'),
      session('other', 'study-b', 'active'),
    ]

    expect(findActiveGuidedSession(sessions, 'study-a')?.id).toBe('latest')
  })

  it('does not offer continue when only an ended session exists', () => {
    expect(findActiveGuidedSession([session('ended', 'study-a', 'ended')], 'study-a')).toBeNull()
  })
})
