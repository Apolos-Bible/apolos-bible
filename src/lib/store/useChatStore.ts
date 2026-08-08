import { create } from 'zustand'
import { chatApi, type ChatMessage, type Conversation } from '@/lib/chatApi'
import { aiApi, type AiContextDocument } from '@/lib/aiApi'
import { initEcho, getEcho, onEchoReconnect } from '@/lib/echo'
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
  /** Conversations currently shown in the Messenger-style dock. */
  floatingIds:   number[]
  floatingMinimized: Record<number, boolean>
  messages:      Record<number, ChatMessage[]>
  loadingList:   boolean
  loadingThread: Record<number, boolean>
  typing:        Record<number, TypingEntry[]>
  /** Per-conversation flag: Apolos (AI) is generating a reply right now. */
  aiThinking:    Record<number, boolean>
  /**
   * Per-conversation composer audience. 'apolos' = sticky "Modo Apolos": every
   * message is routed to the AI assistant without a "/apolos" prefix until the
   * user exits. Default (absent) = 'study' (the human group). Local/UI only —
   * never synced to other participants.
   */
  composerAudience: Record<number, 'study' | 'apolos'>

  load: () => Promise<void>
  select: (id: number | null) => Promise<void>
  openFloating: (id: number) => Promise<void>
  minimizeFloating: (id: number) => void
  closeFloating: (id: number) => void
  replaceConversation: (conversation: Conversation) => void
  loadMessages: (id: number) => Promise<void>
  loadOlder: (id: number) => Promise<void>
  send: (id: number, body: string) => Promise<void>
  askApolos: (id: number, sessionId: string, prompt: string, documents?: AiContextDocument[]) => Promise<void>
  setComposerAudience: (id: number, audience: 'study' | 'apolos') => void
  markRead: (id: number) => Promise<void>
  archive: (id: number) => Promise<void>
  unarchive: (id: number) => Promise<void>
  notifyTyping: (id: number) => void
  listenForUpdates: (userId: number) => void
  stopListeningForUpdates: () => void
  startDm: (userId: number) => Promise<Conversation>
  createGroup: (name: string, userIds: number[], description?: string) => Promise<Conversation>
  addParticipants: (id: number, userIds: number[]) => Promise<void>
  leave: (id: number) => Promise<void>
  reset: () => void
}

const subscribed = new Set<number>()
const typingTimers: Record<number, ReturnType<typeof setTimeout>> = {}
const typingThrottle: Record<number, number> = {}
let privateChannelName: string | null = null
let stopReconnectListener: (() => void) | null = null

export function mergeChatMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const messages = new Map(existing.map((message) => [message.id, message]))
  incoming.forEach((message) => messages.set(message.id, message))
  return [...messages.values()].sort((a, b) => a.id - b.id)
}

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
        user:            payload.user_name
          ? { id: payload.user_id, name: payload.user_name, email: payload.user_email ?? '', avatar_url: payload.avatar_url ?? null }
          : null,
        is_ai:           payload.is_ai === true,
        body:            payload.body,
        created_at:      payload.created_at,
      }

      // Echo can replay the same event after a transport reconnect. Treat the
      // message as the idempotency boundary so unread counters and native
      // notifications are not duplicated either.
      if ((get().messages[id] ?? []).some((existing) => existing.id === message.id)) return

      set((s) => {
        const existing = s.messages[id] ?? []
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
            archived_at:    null,
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
        const senderName = message.user?.name || 'Apolos'
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
  floatingIds:   [],
  floatingMinimized: {},
  messages:      {},
  loadingList:   false,
  loadingThread: {},
  typing:        {},
  aiThinking:    {},
  composerAudience: {},

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

  openFloating: async (id) => {
    set((s) => ({
      // Keep the dock compact and bring the conversation just opened to the front.
      floatingIds: [...s.floatingIds.filter((floatingId) => floatingId !== id), id].slice(-3),
      floatingMinimized: { ...s.floatingMinimized, [id]: false },
    }))
    clearChatNotifications(id)
    if (get().messages[id] === undefined) await get().loadMessages(id)
    await get().markRead(id)
  },

  minimizeFloating: (id) =>
    set((s) => ({ floatingMinimized: { ...s.floatingMinimized, [id]: true } })),

  closeFloating: (id) =>
    set((s) => ({
      floatingIds: s.floatingIds.filter((floatingId) => floatingId !== id),
      floatingMinimized: Object.fromEntries(
        Object.entries(s.floatingMinimized).filter(([floatingId]) => Number(floatingId) !== id),
      ),
    })),

  replaceConversation: (conversation) =>
    set((s) => ({
      conversations: sortConversations([
        conversation,
        ...s.conversations.filter((item) => item.id !== conversation.id),
      ]),
    })),

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
              archived_at:    null,
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

  // Invoke the Apolos AI assistant for a study conversation. The human "/apolos"
  // message has already been sent; this runs the grounded loop server-side,
  // appends Apolos's persisted reply, and applies any canvas mutations. Other
  // participants receive the reply over the normal realtime channel.
  askApolos: async (id, sessionId, prompt, documents) => {
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
                archived_at: null,
                last_message_at: message.created_at,
                last_message: {
                  id:         message.id,
                  user_id:    message.user_id,
                  user_name:  message.user?.name ?? 'Apolos',
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
          ? i18n.t('study.ai.errorVerify', 'Verifica tu correo para usar a Apolos.')
          : status === 429
            ? i18n.t('study.ai.errorBudget', 'Has alcanzado el límite de IA de este mes.')
            : i18n.t('study.ai.errorGeneric', 'No se pudo contactar a Apolos. Intenta de nuevo.')
      useUIStore.getState().addToast(msg, 'error')
    } finally {
      set((s) => ({ aiThinking: { ...s.aiThinking, [id]: false } }))
    }
  },

  setComposerAudience: (id, audience) =>
    set((s) => ({ composerAudience: { ...s.composerAudience, [id]: audience } })),

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

  archive: async (id) => {
    const { archived_at } = await chatApi.archive(id)
    set((s) => ({
      conversations: s.conversations.map((conversation) =>
        conversation.id === id ? { ...conversation, archived_at } : conversation,
      ),
      selectedId: s.selectedId === id ? null : s.selectedId,
      floatingIds: s.floatingIds.filter((floatingId) => floatingId !== id),
      floatingMinimized: Object.fromEntries(
        Object.entries(s.floatingMinimized).filter(([floatingId]) => Number(floatingId) !== id),
      ),
    }))
  },

  unarchive: async (id) => {
    await chatApi.unarchive(id)
    set((s) => ({
      conversations: s.conversations.map((conversation) =>
        conversation.id === id ? { ...conversation, archived_at: null } : conversation,
      ),
    }))
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
    stopReconnectListener ??= onEchoReconnect(() => {
      void get().load()
      subscribed.forEach((conversationId) => {
        void chatApi.messages(conversationId).then((incoming) => {
          set((state) => ({
            messages: {
              ...state.messages,
              [conversationId]: mergeChatMessages(state.messages[conversationId] ?? [], incoming),
            },
          }))
        }).catch(() => {})
      })
    })

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
    stopReconnectListener?.()
    stopReconnectListener = null
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

  createGroup: async (name, userIds, description) => {
    const c = await chatApi.createGroup(name, userIds, description)
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
    stopReconnectListener?.()
    stopReconnectListener = null
    set({ conversations: [], selectedId: null, floatingIds: [], floatingMinimized: {}, messages: {}, typing: {}, aiThinking: {}, composerAudience: {} })
  },
}))
