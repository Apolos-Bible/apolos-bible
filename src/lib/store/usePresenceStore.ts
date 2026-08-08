import { create } from 'zustand'
import type { PresenceUser } from '@/types'
import { initEcho, getEcho, onEchoReconnect } from '@/lib/echo'
import { useActivityStore } from './useActivityStore'
import { useUIStore } from './useUIStore'
import { useFriendStore } from './useFriendStore'

type PresenceStore = {
  others: PresenceUser[]
  joinChapter: (bookNumber: number, chapterNumber: number, selfId: string) => void
  leaveChapter: () => void
}

let _channelName: string | null = null
let _currentChapter: { bookNumber: number; chapterNumber: number; selfId: string } | null = null
let _stopReconnectListener: (() => void) | null = null

export const usePresenceStore = create<PresenceStore>((set) => ({
  others: [],

  joinChapter: (bookNumber, chapterNumber, selfId) => {
    // Presence channels require an authenticated user; skip silently for guests.
    if (!localStorage.getItem('verbum_token')) return

    const echo = initEcho()
    if (!echo) return

    _currentChapter = { bookNumber, chapterNumber, selfId }
    _stopReconnectListener ??= onEchoReconnect(() => {
      const chapter = _currentChapter
      if (!chapter) return
      if (_channelName) echo.leave(_channelName)
      _channelName = null
      usePresenceStore.getState().joinChapter(chapter.bookNumber, chapter.chapterNumber, chapter.selfId)
    })

    if (_channelName) {
      echo.leave(_channelName)
    }

    _channelName = `chapter.${bookNumber}.${chapterNumber}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(echo.join(_channelName) as any)
      .error((error: unknown) => {
        console.error('[presence] subscription error', error)
        useUIStore.getState().addToast('Realtime presence subscription failed', 'error')
      })
      .here((users: PresenceUser[]) => {
        const friendIds = new Set(useFriendStore.getState().friends.map((f) => f.id))
        set({ others: users.filter((u) => String(u.id) !== selfId && friendIds.has(u.id)) })
      })
      .joining((user: PresenceUser) => {
        const friendIds = new Set(useFriendStore.getState().friends.map((f) => f.id))
        if (!friendIds.has(user.id)) return
        set((s) => ({
          others: s.others.some((u) => u.id === user.id)
            ? s.others
            : [...s.others, user],
        }))
      })
      .leaving((user: PresenceUser) => {
        set((s) => ({ others: s.others.filter((u) => u.id !== user.id) }))
      })
      .listen('.verse.activity', (e: {
        verse_number: number
        user_id: number
        user_name: string
        action: 'noted' | 'highlighted'
      }) => {
        if (String(e.user_id) === selfId) return

        useActivityStore.getState().recordActivity(e.verse_number, {
          userId:   e.user_id,
          userName: e.user_name,
          action:   e.action,
          ts:       Date.now(),
        })

        const verb = e.action === 'noted' ? 'added a note' : 'highlighted a verse'
        useUIStore.getState().addToast(`${e.user_name} ${verb}`, 'info')
      })
  },

  leaveChapter: () => {
    _currentChapter = null
    _stopReconnectListener?.()
    _stopReconnectListener = null
    if (_channelName) {
      getEcho()?.leave(_channelName)
      _channelName = null
    }
    set({ others: [] })
    useActivityStore.getState().clearAll()
  },
}))
