import { create } from 'zustand'
import { chatApi, type ChatMessage, type Conversation } from '@/lib/chatApi'
import { aiApi, type AiContextDocument } from '@/lib/aiApi'
import { initEcho, getEcho } from '@/lib/echo'
import i18n from '@/lib/i18n'
import { useAuthStore } from './useAuthStore'
import { useUIStore } from './useUIStore'
import { useVerseStore } from './useVerseStore'
import { notifyChatMessage, clearChatNotifications } from '@/lib/desktopNotify'

interface TypingEntry {
  userId:   number
  userName: string
  expiresAt: number
}

type ChatState = {
  conversations: Conversation[]
  selectedId:    number | null
  messages:      Record<number, ChatMessage[]>
  loadingList:   boolean
  loadingThread: Record<number, boolean>
  typing:        Record<number, TypingEntry[]>
  /** Per-conversation flag: Tulia (AI) is generating a reply right now. */
  aiThinking:    Record<number, boolean>

  load: () => Promise<void>
  select: (id: number | null) => Promise<void>
  loadMessages: (id: number) => Promise<void>
  loadOlder: (id: number) => Promise<void>
  send: (id: number, body: string) => Promise<void>
  askTulia: (id: number, sessionId: string, prompt: string, documents?: AiContextDocument[]) => Promise<void>
  markRead: (id: number) => Promise<void>
  notifyTyping: (id: number) => void
  listenForUpdates: (userId: number) => void
  stopListeningForUpdates: () => void
  startDm: (userId: number) => Promise<Conversation>
  createGroup: (name: string, userIds: number[]) => Promise<Conversation>
  addParticipants: (id: number, userIds: number[]) => Promise<void>
  leave: (id: number) => Promise<void>
  reset: () => void
}

const subscribed = new Set<number>()
const typingTimers: Record<number, ReturnType<typeof setTimeout>> = {}
const typingThrottle: Record<number, number> = {}
let privateChannelName: string | null = null

function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''))
}

function pruneTyping(id: number, set: (fn: (s: ChatState) => Partial<ChatState>) => void) {
  const now = Date.now()
  set((s) => {
    const filtered = (s.typing[id] ?? []).filter((t) => t.expiresAt > now)
    return { typing: { ...s.typing, [id]: filtered } }
  })
}

function subscribeToConversation(id: number, set: (fn: (s: ChatState) => Partial<ChatState>) => void, get: () => ChatState) {
  if (subscribed.has(id)) return
  const echo = initEcho()
  if (!echo) return

  subscribed.add(id)
  const channelName = `conversation.${id}`

  echo.private(channelName)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .listen('.message.sent', (payload: any) => {
      const message: ChatMessage = {
        id:              payload.id,
        conversation_id: payload.conversation_id,
        user_id:         payload.user_id,
        user:            payload.user_name ? { id: payload.user_id, name: payload.user_name, email: '' } : null,
        is_ai:           payload.is_ai === true,
        body:            payload.body,
        created_at:      payload.created_at,
      }

      set((s) => {
        const existing = s.messages[id] ?? []
        if (existing.some((m) => m.id === message.id)) return s
        return { messages: { ...s.messages, [id]: [...existing, message] } }
      })

      const authId = useAuthStore.getState().user?.id
      const isSelected = get().selectedId === id

      set((s) => {
        const list = s.conversations.map((c) => {
          if (c.id !== id) return c
          const isFromSelf = authId !== undefined && message.user_id === authId
          return {
            ...c,
            last_message_at: message.created_at,
            unread_count:    isSelected || isFromSelf ? c.unread_count : c.unread_count + 1,
            last_message: {
              id:         message.id,
              user_id:    message.user_id,
              user_name:  message.user?.name ?? null,
              body:       message.body,
              created_at: message.created_at,
            },
          }
        })
        list.sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''))
        return { conversations: list }
      })

      if (isSelected) {
        chatApi.markRead(id).catch(() => {})
      } else if (authId !== undefined && message.user_id !== authId) {
        // Desktop tray: render an OS banner via tauri-plugin-notification.
        // Web/SW path is handled by FCM data-only pushes; backend skips
        // FCM when the user is online so this won't double up.
        const senderName = message.user?.name || 'Tulia'
        void notifyChatMessage(id, senderName, message.body)
      }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .listen('.user.typing', (payload: any) => {
      const userId   = payload.user_id   as number
      const userName = payload.user_name as string
      const authId   = useAuthStore.getState().user?.id
      if (authId === userId) return

      set((s) => {
        const others = (s.typing[id] ?? []).filter((t) => t.userId !== userId)
        return {
          typing: {
            ...s.typing,
            [id]: [...others, { userId, userName, expiresAt: Date.now() + 4000 }],
          },
        }
      })

      if (typingTimers[id]) clearTimeout(typingTimers[id])
      typingTimers[id] = setTimeout(() => pruneTyping(id, set), 4100)
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .listen('.message.read', (payload: any) => {
      const userId     = payload.user_id      as number
      const lastReadAt = payload.last_read_at as string

      set((s) => ({
        conversations: s.conversations.map((c) => {
          if (c.id !== id) return c
          return {
            ...c,
            participants: c.participants.map((p) =>
              p.id === userId ? { ...p, last_read_at: lastReadAt } : p,
            ),
          }
        }),
      }))
    })
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  selectedId:    null,
  messages:      {},
  loadingList:   false,
  loadingThread: {},
  typing:        {},
  aiThinking:    {},

  load: async () => {
    set({ loadingList: true })
    try {
      const list = await chatApi.list()
      set({ conversations: list, loadingList: false })
      list.forEach((c) => subscribeToConversation(c.id, set, get))
    } catch {
      set({ loadingList: false })
    }
  },

  select: async (id) => {
    set({ selectedId: id })
    if (id === null) return
    clearChatNotifications(id)
    if (get().messages[id] === undefined) await get().loadMessages(id)
    await get().markRead(id)
  },

  loadMessages: async (id) => {
    const state = get()
    if (state.loadingThread[id]) return
    if (state.messages[id] !== undefined) return
    set((s) => ({ loadingThread: { ...s.loadingThread, [id]: true } }))
    try {
      const msgs = await chatApi.messages(id)
      set((s) => ({
        messages: { ...s.messages, [id]: msgs },
        loadingThread: { ...s.loadingThread, [id]: false },
      }))
      subscribeToConversation(id, set, get)
    } catch {
      set((s) => ({ loadingThread: { ...s.loadingThread, [id]: false } }))
    }
  },

  loadOlder: async (id) => {
    const existing = get().messages[id] ?? []
    if (existing.length === 0) return
    const before = existing[0].id
    const older = await chatApi.messages(id, before)
    if (older.length === 0) return
    set((s) => ({ messages: { ...s.messages, [id]: [...older, ...(s.messages[id] ?? [])] } }))
  },

  send: async (id, body) => {
    const trimmed = body.trim()
    if (!trimmed) return
    const message = await chatApi.send(id, trimmed)
    set((s) => {
      const existing = s.messages[id] ?? []
      if (existing.some((m) => m.id === message.id)) return s
      return { messages: { ...s.messages, [id]: [...existing, message] } }
    })

    set((s) => {
      const list = s.conversations.map((c) =>
        c.id === id
          ? {
              ...c,
              last_message_at: message.created_at,
              unread_count:    0,
              last_read_at:    message.created_at,
              last_message: {
                id:         message.id,
                user_id:    message.user_id,
                user_name:  message.user?.name ?? null,
                body:       message.body,
                created_at: message.created_at,
              },
            }
          : c,
      )
      list.sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''))
      return { conversations: list }
    })
  },

  // Invoke the Tulia AI assistant for a study conversation. The human "@tulia"
  // message has already been sent; this runs the grounded loop server-side,
  // appends Tulia's persisted reply, and applies any canvas mutations. Other
  // participants receive the reply over the normal realtime channel.
  askTulia: async (id, sessionId, prompt, documents) => {
    set((s) => ({ aiThinking: { ...s.aiThinking, [id]: true } }))
    try {
      const actions = (window as never as { __studyCanvasActions?: {
        getCanvasContext?: () => { nodes: unknown[]; edges: unknown[] }
        applyAiMutations?: (m: unknown[]) => void
      } }).__studyCanvasActions
      const canvas = actions?.getCanvasContext?.() ?? { nodes: [], edges: [] }
      const versionId = useVerseStore.getState().versionId

      const res = await aiApi.studyChat({
        session_id: sessionId,
        conversation_id: id,
        version_id: versionId,
        prompt,
        canvas: canvas as { nodes: never[]; edges: never[] },
        ...(documents && documents.length > 0 ? { documents } : {}),
      })

      const message = res.message
      set((s) => {
        const existing = s.messages[id] ?? []
        if (existing.some((m) => m.id === message.id)) return s
        return { messages: { ...s.messages, [id]: [...existing, message] } }
      })
      set((s) => {
        const list = s.conversations.map((c) =>
          c.id === id
            ? {
                ...c,
                last_message_at: message.created_at,
                last_message: {
                  id:         message.id,
                  user_id:    message.user_id,
                  user_name:  message.user?.name ?? 'Tulia',
                  body:       message.body,
                  created_at: message.created_at,
                },
              }
            : c,
        )
        list.sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''))
        return { conversations: list }
      })

      if (Array.isArray(res.mutations) && res.mutations.length > 0) {
        actions?.applyAiMutations?.(res.mutations as unknown[])
      }
    } catch (e) {
      const status = (e as { status?: number } | null)?.status
      const msg =
        status === 403
          ? i18n.t('study.ai.errorVerify', 'Verifica tu correo para usar a Tulia.')
          : status === 429
            ? i18n.t('study.ai.errorBudget', 'Has alcanzado el límite de IA de este mes.')
            : i18n.t('study.ai.errorGeneric', 'No se pudo contactar a Tulia. Intenta de nuevo.')
      useUIStore.getState().addToast(msg, 'error')
    } finally {
      set((s) => ({ aiThinking: { ...s.aiThinking, [id]: false } }))
    }
  },

  markRead: async (id) => {
    try {
      await chatApi.markRead(id)
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === id ? { ...c, unread_count: 0, last_read_at: new Date().toISOString() } : c,
        ),
      }))
    } catch {
      // ignore
    }
  },

  notifyTyping: (id) => {
    const now  = Date.now()
    const last = typingThrottle[id] ?? 0
    if (now - last < 2000) return
    typingThrottle[id] = now
    chatApi.typing(id).catch(() => {})
  },

  listenForUpdates: (userId) => {
    if (privateChannelName) return

    const echo = initEcho()
    if (!echo) return

    privateChannelName = `App.Models.User.${userId}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    echo.private(privateChannelName).listen('.conversation.available', (payload: any) => {
      const conversation = payload as Conversation
      const existing = get().conversations.find((c) => c.id === conversation.id)

      set((s) => ({
        conversations: sortConversations([
          conversation,
          ...s.conversations.filter((c) => c.id !== conversation.id),
        ]),
      }))

      subscribeToConversation(conversation.id, set, get)

      if (!existing) {
        const title = conversation.type === 'group'
          ? (conversation.name ?? i18n.t('chat.newGroupChatFallback'))
          : (conversation.participants.find((p) => p.id !== userId)?.name ?? i18n.t('chat.newChatFallback'))
        useUIStore.getState().addToast(i18n.t('chat.conversationAvailable', { title }), 'info')
      }
    })
  },

  stopListeningForUpdates: () => {
    if (!privateChannelName) return
    getEcho()?.leave(privateChannelName)
    privateChannelName = null
  },

  startDm: async (userId) => {
    const c = await chatApi.createDm(userId)
    set((s) => {
      const without = s.conversations.filter((x) => x.id !== c.id)
      return { conversations: sortConversations([c, ...without]) }
    })
    subscribeToConversation(c.id, set, get)
    return c
  },

  createGroup: async (name, userIds) => {
    const c = await chatApi.createGroup(name, userIds)
    set((s) => ({ conversations: sortConversations([c, ...s.conversations]) }))
    subscribeToConversation(c.id, set, get)
    return c
  },

  addParticipants: async (id, userIds) => {
    const c = await chatApi.addParticipants(id, userIds)
    set((s) => ({ conversations: s.conversations.map((x) => (x.id === id ? c : x)) }))
  },

  leave: async (id) => {
    await chatApi.leave(id)
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      selectedId:    s.selectedId === id ? null : s.selectedId,
    }))
    const echo = getEcho()
    if (echo) echo.leave(`conversation.${id}`)
    subscribed.delete(id)
  },

  reset: () => {
    const echo = getEcho()
    if (echo) {
      subscribed.forEach((id) => echo.leave(`conversation.${id}`))
      if (privateChannelName) echo.leave(privateChannelName)
    }
    subscribed.clear()
    privateChannelName = null
    set({ conversations: [], selectedId: null, messages: {}, typing: {}, aiThinking: {} })
  },
}))
