import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarDays,
  Camera,
  ChevronLeft,
  ImageOff,
  LogOut,
  MessageCircle,
  Save,
  ShieldCheck,
  UserMinus,
  UserPlus,
  UsersRound,
} from 'lucide-react'
import { AppPageLayout } from '@/components/layout/AppPageLayout'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { Switch } from '@/components/ui/Switch'
import { cn } from '@/lib/cn'
import { chatApi, type Conversation } from '@/lib/chatApi'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useChatStore } from '@/lib/store/useChatStore'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { paths } from '@/router/paths'
import { NotFound } from './NotFound'

export function ConversationRoute() {
  const params = useParams<{ conversationId?: string }>()
  const id = Number(params.conversationId)

  if (!Number.isInteger(id) || id < 1) return <NotFound />
  return <ConversationPage conversationId={id} />
}

function ConversationPage({ conversationId }: { conversationId: number }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const conversation = useChatStore((s) => s.conversations.find((item) => item.id === conversationId))
  const replaceConversation = useChatStore((s) => s.replaceConversation)
  const openFloating = useChatStore((s) => s.openFloating)
  const leave = useChatStore((s) => s.leave)
  const friends = useFriendStore((s) => s.friends)
  const loadFriends = useFriendStore((s) => s.load)
  const openAuthModal = useUIStore((s) => s.openAuthModal)
  const addToast = useUIStore((s) => s.addToast)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal()
      navigate(paths.root(), { replace: true })
    }
  }, [authLoading, user, openAuthModal, navigate])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    chatApi.show(conversationId)
      .then((result) => {
        if (!cancelled) replaceConversation(result)
      })
      .catch((error: { status?: number }) => {
        if (!cancelled && (error.status === 403 || error.status === 404)) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [conversationId, replaceConversation])

  useEffect(() => {
    if (conversation?.type !== 'dm') return
    const other = conversation.participants.find((participant) => participant.id !== user?.id)
    if (other) navigate(paths.userProfile(other.id), { replace: true })
  }, [conversation, user?.id, navigate])

  if (notFound) return <NotFound />

  return (
    <AppPageLayout title={conversation?.name ?? t('chat.groupChat')}>
      {loading && !conversation ? (
        <div className="mx-auto max-w-5xl px-5 py-12 text-sm text-text-muted">{t('common.loading')}</div>
      ) : conversation?.type === 'group' && user ? (
        <GroupConversationPage
          conversation={conversation}
          userId={user.id}
          friends={friends}
          loadFriends={loadFriends}
          onBack={() => navigate(paths.root())}
          onOpenChat={() => {
            void openFloating(conversation.id)
          }}
          onLeave={async () => {
            await leave(conversation.id)
            navigate(paths.root())
          }}
          addToast={addToast}
        />
      ) : null}
    </AppPageLayout>
  )
}

type GroupConversationPageProps = {
  conversation: Conversation
  userId: number
  friends: ReturnType<typeof useFriendStore.getState>['friends']
  loadFriends: () => Promise<void>
  onBack: () => void
  onOpenChat: () => void
  onLeave: () => Promise<void>
  addToast: ReturnType<typeof useUIStore.getState>['addToast']
}

function GroupConversationPage({
  conversation,
  userId,
  friends,
  loadFriends,
  onBack,
  onOpenChat,
  onLeave,
  addToast,
}: GroupConversationPageProps) {
  const { t, i18n } = useTranslation()
  const replaceConversation = useChatStore((s) => s.replaceConversation)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState(conversation.name ?? '')
  const [description, setDescription] = useState(conversation.description ?? '')
  const [membersCanInvite, setMembersCanInvite] = useState(conversation.members_can_invite ?? false)

  const self = conversation.participants.find((participant) => participant.id === userId)
  const isAdmin = self?.role === 'admin' || conversation.created_by === userId
  const canInvite = isAdmin || membersCanInvite
  const existingIds = useMemo(
    () => new Set(conversation.participants.map((participant) => participant.id)),
    [conversation.participants],
  )
  const availableFriends = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return friends
      .filter((friend) => !existingIds.has(friend.id))
      .filter((friend) => !normalized || friend.name.toLowerCase().includes(normalized) || friend.email.toLowerCase().includes(normalized))
  }, [friends, existingIds, query])

  useEffect(() => {
    setName(conversation.name ?? '')
    setDescription(conversation.description ?? '')
    setMembersCanInvite(conversation.members_can_invite ?? false)
  }, [
    conversation.id,
    conversation.name,
    conversation.description,
    conversation.members_can_invite,
  ])

  useEffect(() => {
    if (canInvite) void loadFriends()
  }, [canInvite, loadFriends])

  const run = async (action: () => Promise<Conversation>, success?: string): Promise<boolean> => {
    if (busy) return false
    setBusy(true)
    try {
      const result = await action()
      replaceConversation(result)
      if (success) addToast(success, 'success')
      return true
    } catch {
      addToast(t('chat.groupActionFailed'), 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  const saveSettings = () => run(
    () => chatApi.updateSettings(conversation.id, {
      name: name.trim() || null,
      description: description.trim() || null,
      members_can_invite: membersCanInvite,
    }),
    t('chat.groupUpdated'),
  )

  const addMembers = async () => {
    if (picked.length === 0) return
    const updated = await run(
      () => chatApi.addParticipants(conversation.id, picked),
      t('chat.participantsAdded'),
    )
    if (updated) setPicked([])
  }

  const changeAvatar = async (file: File | undefined) => {
    if (!file) return
    await run(() => chatApi.uploadAvatar(conversation.id, file), t('chat.groupAvatarUpdated'))
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  const removeMember = (participantId: number, participantName: string) => {
    if (!window.confirm(t('chat.confirmRemoveMember', { name: participantName }))) return
    void run(() => chatApi.kickMember(conversation.id, participantId))
  }

  const createdLabel = conversation.created_at
    ? new Date(conversation.created_at).toLocaleDateString(i18n.language, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="min-h-full bg-bg-secondary">
      <div className="workspace-page-frame mx-auto max-w-5xl px-4 py-5 md:px-8 md:py-8">
        <div className="workspace-conversation-actions mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('chat.backToChat')}
          </button>
          <button
            type="button"
            onClick={onOpenChat}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-accent px-4 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {t('chat.openConversationButton')}
          </button>
        </div>

        <header className="border-b border-border-subtle pb-8">
          <div className="workspace-conversation-header flex flex-col items-center text-center sm:flex-row sm:items-end sm:text-left">
            <div className="relative shrink-0">
              <GroupAvatar conversation={conversation} />
              {isAdmin && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => { void changeAvatar(event.target.files?.[0]) }}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-bg-secondary bg-text-primary text-bg-secondary shadow-md transition-transform hover:scale-105 disabled:opacity-50"
                    aria-label={t('chat.changeGroupAvatar')}
                    title={t('chat.changeGroupAvatar')}
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            <div className="workspace-conversation-identity mt-4 min-w-0 flex-1 sm:ml-6 sm:mt-0">
              <div className="workspace-conversation-title flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="max-w-full truncate text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
                  {conversation.name ?? t('chat.groupChat')}
                </h1>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-2xs font-semibold text-accent">
                    <ShieldCheck className="h-3 w-3" />
                    {t('chat.admin')}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {t('chat.member', { count: conversation.participants.length })}
                {createdLabel ? ` · ${t('chat.createdOn', { date: createdLabel })}` : ''}
              </p>
              {conversation.description ? (
                <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                  {conversation.description}
                </p>
              ) : (
                <p className="mt-3 text-sm italic text-text-muted">{t('chat.noGroupDescription')}</p>
              )}
            </div>
          </div>
        </header>

        <div className="workspace-conversation-grid mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <main className="min-w-0 space-y-8">
            <section>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">{t('chat.members')}</h2>
                  <p className="mt-0.5 text-xs text-text-muted">{t('chat.groupPermissionsHint')}</p>
                </div>
                <span className="text-xs tabular-nums text-text-muted">{conversation.participants.length}</span>
              </div>

              <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-secondary">
                {conversation.participants.map((participant, index) => {
                  const participantAdmin = participant.role === 'admin' || participant.id === conversation.created_by
                  return (
                    <div
                      key={participant.id}
                      className={cn(
                        'workspace-conversation-member',
                        'flex items-center gap-3 px-4 py-3.5',
                        index > 0 && 'border-t border-border-subtle',
                      )}
                    >
                      <Link to={paths.userProfile(participant.id)} className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
                        <UserAvatar name={participant.name} email={participant.email} src={participant.avatar_url} size="lg" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link to={paths.userProfile(participant.id)} className="block truncate text-sm font-medium text-text-primary hover:text-accent">
                          {participant.name}{participant.id === userId ? ` ${t('chat.you')}` : ''}
                        </Link>
                        <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                          {participantAdmin && <ShieldCheck className="h-3 w-3 text-accent" />}
                          {participantAdmin ? t('chat.admin') : t('chat.memberRole')}
                        </span>
                      </div>
                      {isAdmin && participant.id !== userId && (
                        <div className="workspace-conversation-member-actions flex items-center gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              void run(() => participantAdmin
                                ? chatApi.demoteMember(conversation.id, participant.id)
                                : chatApi.promoteMember(conversation.id, participant.id))
                            }}
                            className="rounded-md px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-50"
                          >
                            {participantAdmin ? t('chat.demote') : t('chat.promote')}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => removeMember(participant.id, participant.name)}
                            className="rounded-md p-2 text-text-muted transition-colors hover:bg-red-400/10 hover:text-red-400 disabled:opacity-50"
                            aria-label={t('chat.removeMember', { name: participant.name })}
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {canInvite && !conversation.study_session_id && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-accent" />
                  <h2 className="text-base font-semibold text-text-primary">{t('chat.addFriends')}</h2>
                </div>
                <div className="rounded-xl border border-border-subtle p-4">
                  <div className="workspace-conversation-invite flex gap-2">
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={t('chat.searchFriendsPlaceholder')}
                      className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-bg-primary px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                    />
                    <button
                      type="button"
                      disabled={picked.length === 0 || busy}
                      onClick={() => { void addMembers() }}
                      className="rounded-lg bg-text-primary px-4 py-2 text-xs font-semibold text-bg-secondary transition-opacity disabled:opacity-30"
                    >
                      {t('chat.addPeople')}{picked.length ? ` (${picked.length})` : ''}
                    </button>
                  </div>
                  <div className="mt-3 max-h-56 space-y-1 overflow-y-auto">
                    {availableFriends.length === 0 ? (
                      <p className="py-4 text-center text-xs text-text-muted">{t('chat.noFriendsToAdd')}</p>
                    ) : availableFriends.map((friend) => {
                      const selected = picked.includes(friend.id)
                      return (
                        <button
                          key={friend.id}
                          type="button"
                          onClick={() => setPicked((current) => selected
                            ? current.filter((id) => id !== friend.id)
                            : [...current, friend.id])}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                            selected ? 'bg-accent/10' : 'hover:bg-bg-tertiary',
                          )}
                        >
                          <UserAvatar name={friend.name} email={friend.email} src={friend.avatar_url} size="md" />
                          <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{friend.name}</span>
                          <span className={cn(
                            'flex h-4 w-4 items-center justify-center rounded-full border',
                            selected ? 'border-accent bg-accent' : 'border-border-subtle',
                          )}>
                            {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </section>
            )}
          </main>

          <aside className="space-y-6">
            {isAdmin ? (
              <section className="rounded-xl border border-border-subtle p-5">
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-text-primary">{t('chat.groupSettings')}</h2>
                  <p className="mt-0.5 text-xs text-text-muted">{t('chat.groupSettingsHint')}</p>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-text-secondary">{t('chat.groupName')}</span>
                    <input
                      value={name}
                      maxLength={120}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-text-secondary">{t('chat.groupDescription')}</span>
                    <textarea
                      value={description}
                      maxLength={1000}
                      rows={5}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder={t('chat.groupDescriptionPlaceholder')}
                      className="w-full resize-none rounded-lg border border-border-subtle bg-bg-primary px-3 py-2.5 text-sm leading-5 text-text-primary outline-none transition-colors focus:border-accent"
                    />
                    <span className="mt-1 block text-right text-2xs tabular-nums text-text-muted">{description.length}/1000</span>
                  </label>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle p-3">
                    <span className="text-xs leading-5 text-text-secondary">{t('chat.membersCanInvite')}</span>
                    <Switch
                      checked={membersCanInvite}
                      onCheckedChange={setMembersCanInvite}
                      ariaLabel={t('chat.membersCanInvite')}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => { void saveSettings() }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {t('common.save')}
                  </button>
                </div>
              </section>
            ) : (
              <section className="rounded-xl border border-border-subtle p-5">
                <h2 className="text-sm font-semibold text-text-primary">{t('chat.aboutGroup')}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                  {conversation.description || t('chat.noGroupDescription')}
                </p>
              </section>
            )}

            <section className="rounded-xl border border-border-subtle p-5">
              <h2 className="text-sm font-semibold text-text-primary">{t('chat.groupInfo')}</h2>
              <dl className="mt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <UsersRound className="h-4 w-4 text-text-muted" />
                  <div>
                    <dt className="text-2xs uppercase tracking-wide text-text-muted">{t('chat.members')}</dt>
                    <dd className="text-sm text-text-primary">{conversation.participants.length}</dd>
                  </div>
                </div>
                {createdLabel && (
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-text-muted" />
                    <div>
                      <dt className="text-2xs uppercase tracking-wide text-text-muted">{t('chat.created')}</dt>
                      <dd className="text-sm text-text-primary">{createdLabel}</dd>
                    </div>
                  </div>
                )}
              </dl>
            </section>

            {isAdmin && conversation.avatar_url && (
              <button
                type="button"
                disabled={busy}
                onClick={() => { void run(() => chatApi.deleteAvatar(conversation.id), t('chat.groupAvatarRemoved')) }}
                className="inline-flex items-center gap-2 text-xs text-text-muted transition-colors hover:text-red-400 disabled:opacity-50"
              >
                <ImageOff className="h-3.5 w-3.5" />
                {t('chat.removeGroupAvatar')}
              </button>
            )}

            {!conversation.study_session_id ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(t('chat.confirmLeaveGroup'))) void onLeave()
                }}
                className="inline-flex items-center gap-2 text-xs text-red-400 transition-colors hover:text-red-500 disabled:opacity-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t('chat.leaveGroup')}
              </button>
            ) : (
              <p className="text-xs leading-5 text-text-muted">{t('chat.studyLeaveHint')}</p>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

function GroupAvatar({ conversation }: { conversation: Conversation }) {
  if (conversation.avatar_url) {
    return (
      <span className="workspace-conversation-avatar block h-24 w-24 overflow-hidden rounded-full border-4 border-bg-secondary bg-bg-tertiary shadow-sm md:h-28 md:w-28">
        <img src={conversation.avatar_url} alt={conversation.name ?? ''} className="h-full w-full object-cover" />
      </span>
    )
  }

  return (
    <span className="workspace-conversation-avatar flex h-24 w-24 items-center justify-center rounded-full border-4 border-bg-secondary bg-accent/10 text-accent shadow-sm md:h-28 md:w-28">
      <UsersRound className="h-10 w-10 md:h-12 md:w-12" strokeWidth={1.4} />
    </span>
  )
}
