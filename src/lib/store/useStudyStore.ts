import { create } from 'zustand'
import { studyApi } from '@/lib/study/studyApi'
import type { StudySession, StudyInvitation, StudyParticipant } from '@/lib/study/studyApi'

type StudyStore = {
  activeSession: StudySession | null
  wsToken: string | null
  isGuest: boolean
  shareToken: string | null
  myStudies: StudySession[]
  pendingInvitations: StudyInvitation[]
  start: (input: { type: string; anchor_ref?: string; title: string }) => Promise<void>
  join: (sessionId: string) => Promise<void>
  leave: () => Promise<void>
  end: () => Promise<void>
  invite: (userIds: number[]) => Promise<void>
  reopen: (sessionId: string) => Promise<void>
  loadMyStudies: () => Promise<void>
  loadInvitations: () => Promise<void>
  acceptInvitation: (id: number) => Promise<void>
  declineInvitation: (id: number) => Promise<void>
  generateShareLink: () => Promise<string | null>
  loadSharedSession: (shareToken: string) => Promise<void>
  clearSession: () => void
}

export const useStudyStore = create<StudyStore>((set, get) => ({
  activeSession: null,
  wsToken: null,
  isGuest: false,
  shareToken: null,
  myStudies: [],
  pendingInvitations: [],

  start: async (input) => {
    const res = await studyApi.create(input)
    set({
      activeSession: res.session,
      wsToken: res.ws_token,
    })
  },

  join: async (sessionId) => {
    const res = await studyApi.join(sessionId)
    set({
      activeSession: res.session,
      wsToken: res.ws_token,
      isGuest: false,
      shareToken: null,
    })
  },

  leave: async () => {
    const session = get().activeSession
    if (!session) return
    if (!get().isGuest) {
      await studyApi.leave(session.id)
    }
    set({ activeSession: null, wsToken: null, isGuest: false, shareToken: null })
  },

  end: async () => {
    const session = get().activeSession
    if (!session) return
    if (!get().isGuest) {
      await studyApi.end(session.id)
    }
    set({ activeSession: null, wsToken: null, isGuest: false, shareToken: null })
  },

  invite: async (userIds) => {
    const session = get().activeSession
    if (!session) return
    await studyApi.invite(session.id, userIds)
  },

  reopen: async (sessionId) => {
    const res = await studyApi.reopen(sessionId)
    set({
      activeSession: res.session,
      wsToken: res.ws_token,
    })
  },

  loadMyStudies: async () => {
    const studies = await studyApi.list()
    set({ myStudies: studies })
  },

  loadInvitations: async () => {
    const invitations = await studyApi.invitations()
    set({ pendingInvitations: invitations })
  },

  acceptInvitation: async (id) => {
    const res = await studyApi.acceptInvitation(id)
    set({
      activeSession: res.session,
      wsToken: res.ws_token,
    })
  },

  declineInvitation: async (id) => {
    await studyApi.declineInvitation(id)
    set((s) => ({
      pendingInvitations: s.pendingInvitations.filter((i) => i.id !== id),
    }))
  },

  generateShareLink: async () => {
    const session = get().activeSession
    if (!session) return null
    const res = await studyApi.shareLink(session.id)
    set({ shareToken: res.share_token })
    return res.share_url
  },

  loadSharedSession: async (shareToken) => {
    const res = await studyApi.getSharedSession(shareToken)
    set({
      activeSession: res.session,
      wsToken: res.guest_ws_token,
      isGuest: true,
      shareToken,
    })
  },

  clearSession: () => {
    set({
      activeSession: null,
      wsToken: null,
      isGuest: false,
      shareToken: null,
    })
  },
}))
