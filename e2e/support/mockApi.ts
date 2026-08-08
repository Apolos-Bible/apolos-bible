import type { Page, Route } from '@playwright/test'

export const testUser = {
  id: 7,
  name: 'Ana Segura',
  email: 'ana@example.test',
  email_verified_at: '2026-08-01T10:00:00Z',
  avatar_url: null,
  bio: 'Estudio la Biblia con mi comunidad.',
  has_password: true,
  connected_providers: ['password', 'google'],
}

const versions = [{
  id: 1,
  name: 'Reina Valera 1960',
  abbreviation: 'RVR1960',
  language: 'es',
  provider: 'local',
}, {
  id: 2,
  name: 'Nueva Versión Internacional',
  abbreviation: 'NVI',
  language: 'es',
  provider: 'local',
}, {
  id: 3,
  name: 'Nueva Traduccion Viviente',
  abbreviation: 'NTV',
  language: 'es',
  provider: 'local',
}]

const books = [
  { id: 1, number: 1, name: 'Génesis', slug: 'genesis', chapters_count: 50 },
  { id: 43, number: 43, name: 'Juan', slug: 'juan', chapters_count: 21 },
]

function chapterResponse(path: string) {
  const match = path.match(/\/books\/([^/]+)\/chapters\/(\d+)/)
  const slug = match?.[1] ?? 'juan'
  const chapter = Number(match?.[2] ?? 1)
  const isJohn = slug === 'juan'
  return {
    book: { number: isJohn ? 43 : 1, name: isJohn ? 'Juan' : 'Génesis', slug },
    chapter,
    chapter_id: (isJohn ? 43000 : 1000) + chapter,
    verses: [1, 2, 3].map((number) => ({
      id: (isJohn ? 4300000 : 1000000) + chapter * 1000 + number,
      number,
      text: isJohn
        ? ['En el principio era el Verbo.', 'Él estaba con Dios.', 'Todas las cosas por él fueron hechas.'][number - 1]
        : ['En el principio creó Dios.', 'La tierra estaba desordenada.', 'Y dijo Dios: Sea la luz.'][number - 1],
    })),
  }
}

async function fulfill(route: Route, json: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) })
}

interface ApiMockOptions {
  user?: Record<string, unknown>
  resendVerificationStatus?: number
  initialNotes?: Array<Record<string, unknown>>
  profileFriendshipStatus?: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'blocked' | 'blocked_by_them'
  profileLastReading?: Record<string, unknown> | null
  friends?: Array<Record<string, unknown>>
  pushSubscriptions?: Array<Record<string, unknown>>
  studyRole?: 'host' | 'editor' | 'viewer'
  studyGuest?: boolean
  aiScenario?: 'success' | 'quota' | 'rate-then-success' | 'error'
}

export async function installApiMock(
  page: Page,
  onRequest?: (path: string, method: string) => void,
  options: ApiMockOptions = {},
) {
  let currentUser: Record<string, unknown> = { ...(options.user ?? testUser) }
  let notes: Array<Record<string, unknown>> = options.initialNotes?.map((note) => ({ ...note })) ?? []
  let nextNoteId = 7001
  const studyRole = options.studyRole ?? 'host'
  const studyBase = {
    type: 'free', anchor_ref: null, guided_study: null, host_user_id: studyRole === 'host' ? 7 : 77,
    conversation_id: 501, thumbnail_url: null, last_activity_at: '2026-08-08T10:00:00Z',
    created_at: '2026-08-08T10:00:00Z', updated_at: '2026-08-08T10:00:00Z',
    participants: [
      { id: 7, name: 'Ana Segura', role: studyRole, cursor_color: '#4f5dcc', is_present: false },
      ...(studyRole === 'host' ? [] : [{ id: 77, name: 'Host Seguro', role: 'host', cursor_color: '#10b981', is_present: false }]),
    ],
    pending_invitation_count: 0, host: { id: 7, name: 'Ana Segura' },
  }
  const guidedCard = {
    slug: 'hope-path', title: 'Ruta de esperanza', description: 'Esperanza para cada día.',
    visibility: 'public', is_mine: false, author: { id: 21, name: 'Lucía' }, study_count: 1,
    rating_avg: 4.5, rating_count: 2, list_count: 3, my_rating: null, in_my_list: false,
    created_at: '2026-08-01T00:00:00Z',
  }
  const guidedStudy = {
    slug: 'hope-study', title: 'Esperanza firme', theme: 'Confiar en medio de la dificultad.',
    heart_goal: 'Descansar en las promesas de Dios.', memory_verse_ref: 'Juan 1:1',
    memory_verse_text: 'En el principio era el Verbo.', leader_notes: null, position: 0, step_count: 2,
    plan: { slug: 'hope-path', title: 'Ruta de esperanza' },
    steps: [
      { id: 801, position: 0, kind: 'intro', title: 'Comenzamos', reference: null, ranges: [], body: 'Abre el corazón.', prompts: [] },
      { id: 802, position: 1, kind: 'application', title: 'Ponlo en práctica', reference: null, ranges: [], body: 'Da un paso de fe.', prompts: [{ question: '¿Qué harás hoy?', answer: null }] },
    ],
  }
  let guidedInList = false
  let guidedCurrentStep = 0
  let guidedCompletedAt: string | null = null
  const guidedResponses = new Map<string, Record<string, unknown>>()
  let nextGuidedPath = 1
  let nextGuidedStudy = 1
  const authoredStudies = new Map<string, typeof guidedStudy>()
  let authoredPaths: Array<Record<string, any>> = []
  let aiQuestionAttempts = 0
  let studies: Array<Record<string, unknown>> = [{
    ...studyBase, id: 'study-active', title: 'Estudio canvas', status: 'active', ended_at: null,
    participants: [...studyBase.participants, { id: 21, name: 'Lucia Visible', role: 'editor', cursor_color: '#ef4444', is_present: false }],
  }, {
    ...studyBase, id: 'study-ended', title: 'Estudio terminado', status: 'ended', ended_at: '2026-08-08T11:00:00Z',
  }]
  let profileFriendshipStatus = options.profileFriendshipStatus ?? 'none'
  let userSettings: Record<string, unknown> = {
    notes_public_default: false,
    highlights_public_default: false,
    discoverable_by_email: true,
    show_reading_activity: true,
    allow_friend_requests: 'everyone',
  }
  let pushPreferences: Record<string, unknown> = {
    chat_message: true,
    note_reply: true,
    note_like: true,
    friend_request: true,
    friend_accepted: true,
    activity_in_chapter: true,
    study_invitation: true,
    reading_reminder: false,
    quiet_hours_start: null,
    quiet_hours_end: null,
    timezone: null,
    reminder_time: null,
    reminder_timezone: null,
  }
  let pushSubscriptions = options.pushSubscriptions?.map((subscription) => ({ ...subscription })) ?? []
  let bookmarks: Array<Record<string, unknown>> = []
  let highlights: Array<Record<string, unknown>> = []
  let chatMessages: Array<Record<string, unknown>> = []
  let groupConversation: Record<string, unknown> | null = null
  const groupPayload = () => groupConversation
  const directConversation = () => ({
    id: 901,
    type: 'dm',
    name: null,
    created_by: testUser.id,
    last_message_at: chatMessages.at(-1)?.created_at ?? null,
    unread_count: 0,
    last_read_at: null,
    archived_at: null,
    participants: [
      { id: testUser.id, name: currentUser.name, email: currentUser.email, avatar_url: currentUser.avatar_url ?? null, last_read_at: null },
      { id: 21, name: 'Lucia Visible', email: 'lucia.visible@example.test', avatar_url: null, last_read_at: null },
    ],
    last_message: chatMessages.at(-1) ?? null,
  })
  const studyConversation = () => ({
    id: 501, type: 'group', name: 'Estudio canvas', description: null, created_by: testUser.id,
    created_at: '2026-08-08T00:00:00Z', last_message_at: chatMessages.at(-1)?.created_at ?? null,
    unread_count: 0, last_read_at: null, archived_at: null, members_can_invite: false,
    participants: [
      { id: testUser.id, name: currentUser.name, email: currentUser.email, avatar_url: null, last_read_at: null, role: 'admin' },
      { id: 21, name: 'Lucia Visible', email: 'lucia.visible@example.test', avatar_url: null, last_read_at: null, role: 'member' },
    ],
    last_message: chatMessages.at(-1) ?? null,
  })
  let sessions = [
    { id: 11, name: 'Windows · Apolos', current: true, last_used_at: '2026-08-07T20:00:00Z', created_at: '2026-08-01T10:00:00Z' },
    { id: 12, name: 'Mac · Apolos', current: false, last_used_at: '2026-08-06T20:00:00Z', created_at: '2026-08-01T10:00:00Z' },
  ]
  await page.addInitScript(({ user, guest }) => {
    if (!guest && sessionStorage.getItem('apolos_e2e_api_initialized') !== 'true') {
      localStorage.setItem('verbum_token', 'e2e-token')
      sessionStorage.setItem('apolos_e2e_api_initialized', 'true')
    }
    if (guest) {
      localStorage.removeItem('verbum_token')
      sessionStorage.removeItem('apolos_e2e_api_initialized')
    }
    localStorage.setItem('analytics_consent', 'denied')
    localStorage.setItem('tutorial_completed_v1', 'true')
    localStorage.setItem('tutorial_invite_dismissed_v1', 'true')
    localStorage.setItem('lastReading', JSON.stringify({ book: 'juan', chapter: 3, verse: 16 }))
    localStorage.setItem('e2e_user', JSON.stringify(user))
  }, { user: currentUser, guest: options.studyGuest ?? false })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    onRequest?.(path, request.method())

    if (path === '/api/user') {
      if (options.studyGuest) return fulfill(route, { message: 'Unauthenticated.' }, 401)
      if (request.method() === 'GET') return fulfill(route, currentUser)
      const body = request.postDataJSON?.() ?? {}
      if (body._method === 'DELETE') return fulfill(route, { ok: true })
      const { _method: _ignored, ...updates } = body
      currentUser = { ...currentUser, ...updates }
      return fulfill(route, currentUser)
    }
    if (path === '/api/user/settings') {
      if (request.method() === 'GET') return fulfill(route, userSettings)
      const body = request.postDataJSON?.() ?? {}
      const { _method: _ignored, ...updates } = body
      userSettings = { ...userSettings, ...updates }
      return fulfill(route, userSettings)
    }
    if (path === '/api/user/password') {
      currentUser.has_password = true
      const providers = Array.isArray(currentUser.connected_providers) ? currentUser.connected_providers : []
      currentUser.connected_providers = [...new Set([...providers, 'password'])]
      return fulfill(route, { message: 'Password updated.' })
    }
    if (path === '/api/user/avatar'
      && request.headers()['content-type']?.includes('application/json')
      && request.postDataJSON()?._method === 'DELETE') {
      currentUser.avatar_url = null
      return fulfill(route, { avatar_url: null })
    }
    if (path === '/api/user/avatar' && request.method() === 'POST') {
      currentUser.avatar_url = 'data:image/png;base64,iVBORw0KGgo='
      return fulfill(route, { avatar_url: currentUser.avatar_url })
    }
    if (path === '/api/auth/email/resend-verification') {
      if (options.resendVerificationStatus && options.resendVerificationStatus !== 200) {
        return fulfill(route, { message: 'Too Many Attempts.' }, options.resendVerificationStatus)
      }
      return fulfill(route, { message: 'Verification email sent.', verified: false })
    }
    if (path === '/api/user/notes') return fulfill(route, [{
      id: 7101,
      body: '<!--apolos-rich-note--><p>Esperanza personal</p>',
      created_at: '2026-08-07T20:00:00Z',
      is_public: false,
      note_type: 'insight',
      verse: { id: 4301001, number: 1, text: 'En el principio era el Verbo.', chapter: 1, book: 'Juan', slug: 'juan' },
    }])
    if (path === '/api/user/export') {
      const markdown = url.searchParams.get('format') === 'markdown'
      return route.fulfill({
        status: 200,
        contentType: markdown ? 'text/markdown' : 'application/json',
        body: markdown
          ? '# Apolos export\n\nAna Segura — Juan 1:1\n'
          : JSON.stringify({ user: { id: 7, name: 'Ana Segura' }, notes: [{ verse: 'Juan 1:1', body: 'Mi nota' }] }),
      })
    }
    if (path === '/api/user/sessions' && request.method() === 'GET') return fulfill(route, sessions)
    if (path === '/api/user/sessions/others') {
      sessions = sessions.filter((session) => session.current)
      return fulfill(route, { ok: true })
    }
    const sessionMutation = path.match(/^\/api\/user\/sessions\/(\d+)$/)
    if (sessionMutation && request.method() === 'POST') {
      sessions = sessions.filter((session) => session.id !== Number(sessionMutation[1]) || session.current)
      return fulfill(route, { ok: true })
    }
    if (path === '/api/versions') return fulfill(route, versions)
    if (/^\/api\/versions\/\d+\/books$/.test(path)) return fulfill(route, books)
    if (/^\/api\/chapters\/\d+\/cross-ref-verse-ids$/.test(path)) return fulfill(route, [1001001])
    if (/^\/api\/verses\/\d+\/cross-references$/.test(path)) return fulfill(route, [{
      id: 9001,
      book: 'Juan',
      slug: 'juan',
      chapter: 2,
      verse: 1,
      text: 'En el principio era el Verbo.',
    }])
    if (/^\/api\/verses\/\d+\/similar$/.test(path)) return fulfill(route, {
      seed_verse_id: 1001001,
      model: 'test-semantic-v1',
      results: [{
        verse_id: 43002001,
        book: 'Juan',
        book_slug: 'juan',
        chapter: 2,
        verse: 1,
        text: 'En el principio era el Verbo.',
        score: 0.94,
      }],
    })
    if (path.includes('/chapters/')) return fulfill(route, chapterResponse(path))
    if (/^\/api\/versions\/\d+\/search$/.test(path)) {
      if (url.searchParams.get('q')?.includes('inexistente')) return fulfill(route, [])
      return fulfill(route, [{
        id: 43002001,
        book: 'Juan',
        slug: 'juan',
        chapter: 2,
        verse: 1,
        text: 'Al tercer día se hicieron unas bodas en Caná.',
      }])
    }
    if (path === '/api/youversion/versions') return fulfill(route, {
      data: [{
        id: 128,
        abbreviation: 'NVI-YV',
        localized_abbreviation: 'NVI-YV',
        title: 'Nueva Versión Internacional — YouVersion',
        localized_title: 'Nueva Versión Internacional — YouVersion',
        language_tag: 'es',
        publisher_url: 'https://www.biblica.com/',
        youversion_deep_link: 'https://www.bible.com/versions/128',
      }],
      total_size: 1,
      language: 'es',
    })
    if (path === '/api/youversion/bibles/128/index') return fulfill(route, {
      text_direction: 'ltr',
      books: [{
        id: 'JHN', title: 'Juan', canon: 'new_testament',
        chapters: Array.from({ length: 21 }, (_, index) => ({ id: index + 1, passage_id: `JHN.${index + 1}`, title: index + 1 })),
      }],
    })
    if (path.startsWith('/api/youversion/bibles/128/passages/')) return fulfill(route, {
      id: path.split('/').at(-1),
      reference: 'Juan 1',
      content: '<div><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span> En el principio era el Verbo.</div>',
    })
    if (path === '/api/ai/models') return fulfill(route, { models: [{
      slug: 'deepseek/v4-flash',
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      name: 'DeepSeek V4 Flash',
      description: 'Fast public model',
      context_window: 128000,
      max_output_tokens: 8192,
      supports_json: true,
      supports_tools: true,
      supports_vision: false,
      supports_reasoning: false,
    }] })
    if (path === '/api/ai/usage') return fulfill(route, {
      period: '2026-08', input_tokens: 200, input_cached_tokens: 0, output_tokens: 50,
      tokens_used: options.aiScenario === 'quota' ? 1000 : 250,
      tokens_limit: 1000,
      tokens_remaining: options.aiScenario === 'quota' ? 0 : 750,
      request_count: 3,
      percent_used: options.aiScenario === 'quota' ? 100 : 25,
    })
    if (path === '/api/ai/verse-question' && request.method() === 'POST') {
      aiQuestionAttempts += 1
      if (options.aiScenario === 'error') return fulfill(route, { message: 'LLM request failed.' }, 502)
      if (options.aiScenario === 'rate-then-success' && aiQuestionAttempts === 1) {
        return fulfill(route, { message: 'Too many requests.' }, 429)
      }
      if (options.aiScenario === 'quota') return fulfill(route, { message: 'Monthly AI budget exceeded.' }, 429)
      return fulfill(route, {
        answer: 'Juan presenta al Verbo eterno y lo identifica con Dios.', reference: 'Juan 1:1', verse_id: 4301001,
        usage: { period: '2026-08', input_tokens: 240, input_cached_tokens: 0, output_tokens: 60, tokens_used: 300, tokens_limit: 1000, tokens_remaining: 700, percent_used: 30, request_count: 4 },
      })
    }
    if (path === '/api/user/bookmarks') return fulfill(route, bookmarks)
    if (path === '/api/users/search') return fulfill(route, [{
      id: 21,
      name: 'Lucia Visible',
      email: 'lucia.visible@example.test',
      avatar_url: null,
    }])
    if (path === `/api/users/${testUser.id}/profile`) return fulfill(route, {
      user: { ...currentUser, email_verified: true, content_public_default: false },
      is_self: true,
      friendship_status: 'self',
      friendship_id: null,
      last_reading: {
        book_name: 'Juan', book_slug: 'juan', chapter: 3, verse: 16,
        version: 'RVR1960', timestamp: '2026-08-08T00:00:00Z',
      },
      stats: { reading_streak_days: 4, notes_count: 1, highlights_count: 1, friends_count: 0, studies_count: 0 },
      public_highlights: [],
      public_notes: [],
      friends: [],
      studies: [],
      recent_likes: null,
    })
    if (path === '/api/users/21/profile') return fulfill(route, {
      user: { id: 21, name: 'Lucia Visible', email: null, avatar_url: null, bio: 'Perfil social visible.' },
      is_self: false,
      friendship_status: profileFriendshipStatus,
      friendship_id: profileFriendshipStatus === 'pending_sent' || profileFriendshipStatus === 'pending_received' ? 501 : null,
      last_reading: options.profileLastReading ?? null,
      stats: { reading_streak_days: 0, notes_count: 0, highlights_count: 0, friends_count: 0, studies_count: 0 },
      public_highlights: [],
      public_notes: [],
      friends: [],
      studies: [],
      recent_likes: null,
    })
    if (path === '/api/friends/21/block'
      && request.method() === 'POST'
      && request.postDataJSON()?._method !== 'DELETE') {
      profileFriendshipStatus = 'blocked'
      return fulfill(route, { status: 'blocked' })
    }
    if (path === '/api/friends/21/block'
      && request.method() === 'POST'
      && request.postDataJSON()?._method === 'DELETE') {
      profileFriendshipStatus = 'none'
      return fulfill(route, null, 204)
    }
    if (path === '/api/friends/21'
      && request.method() === 'POST'
      && request.postDataJSON()?._method !== 'DELETE') {
      profileFriendshipStatus = 'pending_sent'
      return fulfill(route, {
        id: 501,
        user_id: testUser.id,
        friend_id: 21,
        status: 'pending',
        user: testUser,
        friend: { id: 21, name: 'Lucia Visible', email: 'lucia.visible@example.test', avatar_url: null },
      }, 201)
    }
    if (path === '/api/friend-requests/501'
      && request.method() === 'POST'
      && request.postDataJSON()?._method === 'DELETE') {
      profileFriendshipStatus = 'none'
      return fulfill(route, null, 204)
    }
    if (path === '/api/friend-requests/501/accept'
      && request.method() === 'POST'
      && request.postDataJSON()?._method === 'PATCH') {
      profileFriendshipStatus = 'accepted'
      return fulfill(route, { id: 501, status: 'accepted' })
    }
    if (path === '/api/friends/21'
      && request.method() === 'POST'
      && request.postDataJSON()?._method === 'DELETE') {
      profileFriendshipStatus = 'none'
      return fulfill(route, null, 204)
    }
    if (path === '/api/conversations') {
      if (request.method() === 'POST') {
        const body = request.postDataJSON?.() ?? {}
        if (body.type === 'group') {
          const friendById = new Map((options.friends ?? []).map((friend) => [Number(friend.id), friend]))
          groupConversation = {
            id: 902,
            type: 'group',
            name: body.name,
            description: body.description ?? null,
            created_by: testUser.id,
            created_at: '2026-08-08T00:00:00Z',
            last_message_at: null,
            unread_count: 0,
            last_read_at: null,
            archived_at: null,
            members_can_invite: true,
            participants: [
              { id: testUser.id, name: currentUser.name, email: currentUser.email, avatar_url: null, last_read_at: null, role: 'admin' },
              ...(body.user_ids ?? []).map((id: number) => ({ ...friendById.get(Number(id)), last_read_at: null, role: 'member' })),
            ],
            last_message: null,
          }
          return fulfill(route, groupPayload(), 201)
        }
        return fulfill(route, directConversation(), chatMessages.length === 0 ? 201 : 200)
      }
      return fulfill(route, [
        ...(chatMessages.length > 0 ? [directConversation()] : []),
        ...(groupConversation ? [groupPayload()] : []),
      ])
    }
    if (path === '/api/conversations/501' && request.method() === 'GET') return fulfill(route, studyConversation())
    if (path === '/api/conversations/501/messages') {
      if (request.method() === 'GET') return fulfill(route, chatMessages)
      const body = request.postDataJSON?.() ?? {}
      const message = {
        id: 9950 + chatMessages.length, conversation_id: 501, user_id: testUser.id,
        user: { id: testUser.id, name: currentUser.name, email: currentUser.email, avatar_url: null },
        body: body.body, created_at: '2026-08-08T00:00:00Z',
      }
      chatMessages.push(message)
      return fulfill(route, message, 201)
    }
    if (path === '/api/conversations/501/read') return fulfill(route, {
      last_read_at: '2026-08-08T00:00:00Z', last_read_message_id: chatMessages.at(-1)?.id ?? null,
    })
    if (path === '/api/conversations/501/typing') return fulfill(route, { ok: true })
    if (path === '/api/conversations/902' && request.method() === 'GET') return fulfill(route, groupPayload() ?? {}, groupConversation ? 200 : 404)
    if (path === '/api/conversations/902/settings'
      && request.method() === 'POST'
      && request.postDataJSON()?._method === 'PATCH') {
      const { _method: _ignored, ...updates } = request.postDataJSON()
      groupConversation = { ...(groupConversation ?? {}), ...updates }
      return fulfill(route, groupPayload())
    }
    const groupRole = path.match(/^\/api\/conversations\/902\/members\/(\d+)\/(promote|demote)$/)
    if (groupRole && groupConversation) {
      const participantId = Number(groupRole[1])
      const role = groupRole[2] === 'promote' ? 'admin' : 'member'
      groupConversation = {
        ...groupConversation,
        participants: (groupConversation.participants as Array<Record<string, unknown>>)
          .map((participant) => Number(participant.id) === participantId ? { ...participant, role } : participant),
      }
      return fulfill(route, groupPayload())
    }
    const groupKick = path.match(/^\/api\/conversations\/902\/members\/(\d+)$/)
    if (groupKick && request.postDataJSON()?._method === 'DELETE' && groupConversation) {
      const participantId = Number(groupKick[1])
      groupConversation = {
        ...groupConversation,
        participants: (groupConversation.participants as Array<Record<string, unknown>>)
          .filter((participant) => Number(participant.id) !== participantId),
      }
      return fulfill(route, groupPayload())
    }
    if (path === '/api/conversations/902/messages') return fulfill(route, [])
    if (path === '/api/conversations/902/read') return fulfill(route, { last_read_at: '2026-08-08T00:00:00Z', last_read_message_id: null })
    if (path === '/api/conversations/901/messages') {
      if (request.method() === 'GET') return fulfill(route, chatMessages)
      const body = request.postDataJSON?.() ?? {}
      const message = {
        id: 9900 + chatMessages.length,
        conversation_id: 901,
        user_id: testUser.id,
        user: { id: testUser.id, name: currentUser.name, email: currentUser.email, avatar_url: currentUser.avatar_url ?? null },
        body: body.body,
        created_at: '2026-08-08T00:00:00Z',
      }
      chatMessages.push(message)
      return fulfill(route, message, 201)
    }
    if (path === '/api/conversations/901/read') return fulfill(route, {
      last_read_at: '2026-08-08T00:00:00Z', last_read_message_id: chatMessages.at(-1)?.id ?? null,
    })
    if (path === '/api/conversations/901/typing') return fulfill(route, { ok: true })
    if (path === '/api/friends') return fulfill(route, options.friends ?? [])
    if (path === '/api/highlights/batch') return fulfill(route, highlights)
    const verseNotes = path.match(/^\/api\/verses\/(\d+)\/notes$/)
    if (verseNotes) {
      if (request.method() === 'GET') return fulfill(route, notes)
      const body = request.postDataJSON?.() ?? {}
      const note = {
        id: nextNoteId++,
        verse_id: Number(verseNotes[1]),
        parent_id: body.parent_id ?? null,
        body: body.body ?? '',
        is_public: body.is_public ?? false,
        note_type: body.note_type ?? 'note',
        created_at: '2026-08-07T20:00:00Z',
        user: testUser,
        likes_count: 0,
        is_liked: false,
      }
      notes.push(note)
      return fulfill(route, note, 201)
    }
    const noteMutation = path.match(/^\/api\/notes\/(\d+)$/)
    if (noteMutation) {
      const noteId = Number(noteMutation[1])
      if (request.method() === 'DELETE') {
        const removed = new Set([noteId])
        let changed = true
        while (changed) {
          changed = false
          for (const note of notes) {
            if (removed.has(Number(note.parent_id)) && !removed.has(Number(note.id))) {
              removed.add(Number(note.id))
              changed = true
            }
          }
        }
        notes = notes.filter((note) => !removed.has(Number(note.id)))
        return fulfill(route, { ok: true })
      }
      const body = request.postDataJSON?.() ?? {}
      const current = notes.find((note) => Number(note.id) === noteId)
      if (!current) return fulfill(route, { message: 'Note not found' }, 404)
      Object.assign(current, body)
      return fulfill(route, current)
    }
    const noteLike = path.match(/^\/api\/notes\/(\d+)\/like$/)
    if (noteLike) {
      const current = notes.find((note) => Number(note.id) === Number(noteLike[1]))
      if (!current) return fulfill(route, { message: 'Note not found' }, 404)
      const liked = request.method() !== 'DELETE'
      current.is_liked = liked
      current.likes_count = liked ? 1 : 0
      return fulfill(route, { likes_count: current.likes_count })
    }
    const bookmark = path.match(/^\/api\/verses\/(\d+)\/bookmark$/)
    if (bookmark) {
      const verseId = Number(bookmark[1])
      const deleting = request.postDataJSON?.()?._method === 'DELETE'
      if (deleting) {
        bookmarks = bookmarks.filter((entry) => Number(entry.verse_id) !== verseId)
        return fulfill(route, { ok: true })
      }
      const created = {
        id: 9001,
        verse_id: verseId,
        note: null,
        created_at: '2026-08-07T20:00:00Z',
        verse: { id: verseId, number: 1, text: 'En el principio era el Verbo.', chapter: 1, book: 'Juan', slug: 'juan' },
      }
      bookmarks.push(created)
      return fulfill(route, created)
    }
    const highlight = path.match(/^\/api\/verses\/(\d+)\/highlights$/)
    if (highlight) {
      const verseId = Number(highlight[1])
      if (request.method() === 'GET') {
        return fulfill(route, highlights.filter((entry) => Number(entry.verse_id) === verseId))
      }
      const body = request.postDataJSON?.() ?? {}
      const created = { id: 8001, verse_id: verseId, ...body }
      highlights.push(created)
      return fulfill(route, created)
    }
    const highlightMutation = path.match(/^\/api\/highlights\/(\d+)$/)
    if (highlightMutation) {
      highlights = highlights.filter((entry) => Number(entry.id) !== Number(highlightMutation[1]))
      return fulfill(route, { ok: true })
    }
    if (path === '/api/push/preferences') {
      const body = request.postDataJSON?.() ?? {}
      if (request.method() === 'PATCH' || body._method === 'PATCH') {
        const { _method, ...changes } = body
        pushPreferences = { ...pushPreferences, ...changes }
      }
      return fulfill(route, pushPreferences)
    }
    if (path === '/api/push/subscriptions') return fulfill(route, pushSubscriptions)
    const pushSubscription = path.match(/^\/api\/push\/subscriptions\/(.+)$/)
    if (pushSubscription) {
      const body = request.postDataJSON?.() ?? {}
      if (request.method() === 'DELETE' || body._method === 'DELETE') {
        const token = decodeURIComponent(pushSubscription[1])
        pushSubscriptions = pushSubscriptions.filter((subscription) => subscription.token !== token)
        return route.fulfill({ status: 204, body: '' })
      }
    }
    if (path === '/api/studies/invitations') return fulfill(route, [])
    if (path === '/api/marketplace/featured') return fulfill(route, [guidedCard])
    if (path === '/api/marketplace/paths') return fulfill(route, { paths: [guidedCard], next_cursor: null })
    if (path === '/api/marketplace/paths/hope-path') return fulfill(route, {
      ...guidedCard, in_my_list: guidedInList,
      studies: [{ slug: guidedStudy.slug, title: guidedStudy.title, theme: guidedStudy.theme, position: 0, step_count: 2, progress: null }],
    })
    if (path === '/api/my/study-list') return fulfill(route, guidedInList ? [{ ...guidedCard, in_my_list: true }] : [])
    if (path === '/api/my/guided-plans') return fulfill(route, authoredPaths)
    if (path === '/api/guided-plans' && request.method() === 'POST') {
      const body = request.postDataJSON?.() ?? {}
      const slug = `authored-path-${nextGuidedPath++}`
      const created = {
        slug, title: body.title, description: body.description ?? null, source: 'user',
        visibility: body.visibility ?? 'private', is_published: false, moderation_status: 'draft',
        moderation_source: null, moderation_reason: null, moderation_requested_at: null,
        moderation_reviewed_at: null, is_mine: true, author: { id: 7, name: 'Ana Segura' },
        rating_avg: 0, rating_count: 0, list_count: 0, studies: [],
      }
      authoredPaths = [created, ...authoredPaths]
      return fulfill(route, created, 201)
    }
    const authoredPath = path.match(/^\/api\/guided-plans\/([^/]+)$/)
    if (authoredPath && authoredPaths.some((entry) => entry.slug === authoredPath[1])) {
      const slug = authoredPath[1]
      const body = request.postDataJSON?.() ?? {}
      if (request.method() === 'DELETE' || body._method === 'DELETE') {
        authoredPaths = authoredPaths.filter((entry) => entry.slug !== slug)
        return fulfill(route, { deleted: true })
      }
      const { _method, ...changes } = body
      let updated: Record<string, any> = {}
      authoredPaths = authoredPaths.map((entry) => {
        if (entry.slug !== slug) return entry
        updated = { ...entry, ...changes }
        return updated
      })
      return fulfill(route, updated)
    }
    const authoredStudyCollection = path.match(/^\/api\/guided-plans\/([^/]+)\/studies$/)
    if (authoredStudyCollection && request.method() === 'POST') {
      const pathSlug = authoredStudyCollection[1]
      const body = request.postDataJSON?.() ?? {}
      const studySlug = `authored-study-${nextGuidedStudy++}`
      const created = {
        ...guidedStudy, slug: studySlug, title: body.title, theme: body.theme ?? null,
        heart_goal: body.heart_goal ?? null, memory_verse_ref: body.memory_verse_ref ?? null,
        memory_verse_text: null, leader_notes: body.leader_notes ?? null, step_count: 0,
        plan: { slug: pathSlug, title: authoredPaths.find((entry) => entry.slug === pathSlug)?.title ?? '' },
        steps: [],
      }
      authoredStudies.set(studySlug, created)
      authoredPaths = authoredPaths.map((entry) => entry.slug === pathSlug ? {
        ...entry,
        studies: [...entry.studies, { slug: studySlug, title: created.title, theme: null, position: entry.studies.length, step_count: 0, progress: null }],
      } : entry)
      return fulfill(route, created, 201)
    }
    const authoredStudyMutation = path.match(/^\/api\/guided-plans\/([^/]+)\/studies\/([^/]+)$/)
    if (authoredStudyMutation) {
      const [, pathSlug, studySlug] = authoredStudyMutation
      const body = request.postDataJSON?.() ?? {}
      if (request.method() === 'DELETE' || body._method === 'DELETE') {
        authoredStudies.delete(studySlug)
        authoredPaths = authoredPaths.map((entry) => entry.slug === pathSlug
          ? { ...entry, studies: entry.studies.filter((study: any) => study.slug !== studySlug) }
          : entry)
        return fulfill(route, { deleted: true })
      }
      const current = authoredStudies.get(studySlug)!
      const { _method, ...changes } = body
      const updated = { ...current, ...changes }
      authoredStudies.set(studySlug, updated)
      authoredPaths = authoredPaths.map((entry) => entry.slug === pathSlug ? {
        ...entry,
        studies: entry.studies.map((study: any) => study.slug === studySlug ? { ...study, title: updated.title, theme: updated.theme } : study),
      } : entry)
      return fulfill(route, updated)
    }
    const authoredSteps = path.match(/^\/api\/guided-plans\/([^/]+)\/studies\/([^/]+)\/steps$/)
    if (authoredSteps && (request.method() === 'PUT' || request.postDataJSON?.()?._method === 'PUT')) {
      const [, pathSlug, studySlug] = authoredSteps
      const current = authoredStudies.get(studySlug)!
      const body = request.postDataJSON?.() ?? {}
      const steps = (body.steps ?? []).map((step: any, index: number) => ({
        ...step, id: 9000 + index, position: index, ranges: [],
        prompts: step.prompts.filter((prompt: any) => prompt.question.trim() !== ''),
      }))
      const updated = { ...current, steps, step_count: steps.length }
      authoredStudies.set(studySlug, updated)
      authoredPaths = authoredPaths.map((entry) => entry.slug === pathSlug ? {
        ...entry,
        studies: entry.studies.map((study: any) => study.slug === studySlug ? { ...study, step_count: steps.length } : study),
      } : entry)
      return fulfill(route, updated)
    }
    const publication = path.match(/^\/api\/guided-plans\/([^/]+)\/request-publication$/)
    if (publication && request.method() === 'POST') {
      let updated: Record<string, any> = {}
      authoredPaths = authoredPaths.map((entry) => {
        if (entry.slug !== publication[1]) return entry
        updated = { ...entry, moderation_status: 'pending_review', moderation_requested_at: '2026-08-08T12:00:00Z' }
        return updated
      })
      return fulfill(route, updated)
    }
    if (path === '/api/guided-plans') return fulfill(route, [{
      slug: guidedCard.slug, title: guidedCard.title, description: guidedCard.description,
      studies: [{ slug: guidedStudy.slug, title: guidedStudy.title, theme: guidedStudy.theme, position: 0, step_count: 2, progress: null }],
    }])
    if (path === '/api/guided-studies/hope-study') return fulfill(route, {
      study: guidedStudy,
      progress: { guided_study_id: 801, session_id: 'study-new', current_step: guidedCurrentStep, started_at: '2026-08-08T00:00:00Z', completed_at: guidedCompletedAt },
      responses: Array.from(guidedResponses.values()),
    })
    const authoredStudyDetail = path.match(/^\/api\/guided-studies\/([^/]+)$/)
    if (authoredStudyDetail && authoredStudies.has(authoredStudyDetail[1])) return fulfill(route, {
      study: authoredStudies.get(authoredStudyDetail[1]), progress: null, responses: [],
    })
    if (path === '/api/guided-plans/hope-path/list') {
      guidedInList = request.method() !== 'DELETE'
      return fulfill(route, { in_my_list: guidedInList, list_count: guidedInList ? 4 : 3 })
    }
    if (path === '/api/guided-studies/hope-study/progress') {
      const body = request.postDataJSON?.() ?? {}
      guidedCurrentStep = body.current_step ?? guidedCurrentStep
      if (body.completed) guidedCompletedAt = '2026-08-08T01:00:00Z'
      return fulfill(route, {
        guided_study_id: 801, session_id: body.session_id ?? 'study-new', current_step: guidedCurrentStep,
        started_at: '2026-08-08T00:00:00Z', completed_at: guidedCompletedAt,
      })
    }
    if (/^\/api\/guided-studies\/hope-study\/steps\/\d+\/responses$/.test(path)) {
      const body = request.postDataJSON?.() ?? {}
      const response = { step_id: Number(path.split('/')[5]), prompt_index: body.prompt_index, answer: body.answer ?? null, revealed: body.revealed ?? false }
      guidedResponses.set(`${response.step_id}:${response.prompt_index}`, response)
      return fulfill(route, response)
    }
    if (path === '/api/studies/share/share-token') return fulfill(route, {
      session: studies.find((entry) => entry.id === 'study-active'), guest_ws_token: 'guest-study-token',
    })
    if (/^\/api\/studies\/[^/]+\/links\/check$/.test(path) && request.method() === 'POST') {
      const target = String(request.postDataJSON?.()?.url ?? '')
      const blocked = target.includes('blocked.example')
      return fulfill(route, { embeddable: !blocked, final_url: target, reason: blocked ? 'x-frame-options' : null })
    }
    if (/^\/api\/studies\/[^/]+\/files$/.test(path) && request.method() === 'POST') {
      return fulfill(route, {
        id: 'file-e2e', name: 'guia.txt', mime_type: 'text/plain', size: 12,
        content_url: 'https://files.example.test/guia.txt',
      }, 201)
    }
    if (path === '/api/studies' && request.method() === 'GET') return fulfill(route, studies)
    if (path === '/api/studies' && request.method() === 'POST') {
      const body = request.postDataJSON?.() ?? {}
      const isGuided = body.guided_study_slug === guidedStudy.slug
      const session = {
        ...studyBase, id: 'study-new', title: body.title ?? (isGuided ? guidedStudy.title : null), type: body.type,
        anchor_ref: body.anchor_ref ?? null, guided_study: isGuided ? { slug: guidedStudy.slug, title: guidedStudy.title, step_count: 2 } : null,
        status: 'active', ended_at: null,
      }
      studies = [session, ...studies]
      return fulfill(route, { session, ws_token: 'study-ws-token', participant: studyBase.participants[0] }, 201)
    }
    const reopenStudy = path.match(/^\/api\/studies\/([^/]+)\/reopen$/)
    if (reopenStudy) {
      const original = studies.find((study) => study.id === reopenStudy[1]) ?? studies[0]
      const session = { ...studyBase, id: 'study-reopened', title: `${original.title} (reopened)`, status: 'active', ended_at: null }
      studies = [session, ...studies]
      return fulfill(route, { session, ws_token: 'reopened-ws-token', participant: studyBase.participants[0] })
    }
    const joinStudy = path.match(/^\/api\/studies\/([^/]+)\/join$/)
    if (joinStudy) {
      const session = studies.find((entry) => entry.id === joinStudy[1]) ?? studies[0]
      return fulfill(route, { session, ws_token: 'joined-ws-token', participant: studyBase.participants[0] })
    }
    const study = path.match(/^\/api\/studies\/([^/]+)$/)
    if (study) return fulfill(route, studies.find((entry) => entry.id === study[1]) ?? studies[0])

    return fulfill(route, [])
  })
}

export interface GuestApiRequest {
  path: string
  method: string
  body: unknown
}

interface GuestApiMockOptions {
  loginStatus?: number
  registrationStatus?: number
  resetPasswordStatus?: number
  onRequest?: (request: GuestApiRequest) => void
}

/** Public API fixture for auth journeys that must start without a local token. */
export async function installGuestApiMock(page: Page, options: GuestApiMockOptions = {}) {
  await page.addInitScript(() => {
    localStorage.removeItem('verbum_token')
    localStorage.setItem('analytics_consent', 'denied')
    localStorage.setItem('tutorial_completed_v1', 'true')
    localStorage.setItem('tutorial_invite_dismissed_v1', 'true')
  })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const body = request.postDataJSON?.() ?? null
    options.onRequest?.({ path, method: request.method(), body })

    if (path === '/api/auth/login') {
      if (options.loginStatus && options.loginStatus !== 200) {
        return fulfill(route, { message: 'Invalid credentials' }, options.loginStatus)
      }
      return fulfill(route, { token: 'authenticated-e2e-token', user: testUser })
    }
    if (path === '/api/auth/register') {
      if (options.registrationStatus && options.registrationStatus !== 201) {
        return fulfill(route, { message: 'The email has already been taken.' }, options.registrationStatus)
      }
      return fulfill(route, { token: 'registered-e2e-token', user: testUser }, 201)
    }
    if (path === '/api/auth/forgot-password') {
      return fulfill(route, { message: 'Reset link sent' })
    }
    if (path === '/api/auth/reset-password') {
      if (options.resetPasswordStatus && options.resetPasswordStatus !== 200) {
        return fulfill(route, { message: 'Invalid or expired reset token.' }, options.resetPasswordStatus)
      }
      return fulfill(route, { message: 'Password reset successfully.' })
    }
    if (path === '/api/auth/logout') return fulfill(route, { ok: true })
    if (path === '/api/user/settings') return fulfill(route, {})
    if (path === '/api/user') return fulfill(route, testUser)
    if (path === '/api/versions') return fulfill(route, versions)
    if (path === '/api/versions/1/books') return fulfill(route, books)
    if (path.includes('/chapters/')) return fulfill(route, chapterResponse(path))
    if (path === '/api/youversion/versions') return fulfill(route, { data: [] })
    if (path === '/api/user/bookmarks' || path === '/api/friends' || path === '/api/conversations') return fulfill(route, [])

    return fulfill(route, [])
  })
}
