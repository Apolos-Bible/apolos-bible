import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BadgeCheck, BookOpen, ChevronRight, Compass, GraduationCap, Heart, Store } from 'lucide-react'
import { cn } from '@/lib/cn'
import { modKey } from '@/lib/platform'
import { paths } from '@/router/paths'
import { relativeTime } from '@/lib/relativeTime'
import { noteToPlainText } from '@/lib/richNotes'
import { useUIStore } from '@/lib/store/useUIStore'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProfileActionBar } from './ProfileActionBar'
import { ReportDialog } from '@/components/moderation/ReportDialog'
import type { ProfileData, ProfileMode, ProfileVerseRef } from '@/types'

const HL_BAR: Record<string, string> = {
  yellow: 'bg-[#e5c07b]',
  blue: 'bg-[#61afef]',
  green: 'bg-[#98c379]',
}

const CARD = 'workspace-profile-card rounded-2xl border border-border-subtle bg-bg-secondary p-4 sm:p-5'
const ROW =
  'workspace-profile-row group flex rounded-xl px-3 transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50'
const REF = 'text-2xs font-semibold uppercase tracking-[0.08em] text-accent'

const STATUS_KEY = {
  active: 'study.status.active',
  ended: 'study.status.ended',
  archived: 'study.status.archived',
  draft: 'study.status.draft',
} as const

const PREVIEW_LIMIT = {
  notes: 5,
  highlights: 5,
  likes: 4,
  friends: 6,
  studies: 5,
} as const

type ExpandableSection = keyof typeof PREVIEW_LIMIT

const INITIAL_EXPANDED: Record<ExpandableSection, boolean> = {
  notes: false,
  highlights: false,
  likes: false,
  friends: false,
  studies: false,
}

export interface ProfileViewProps {
  mode: ProfileMode
  data: ProfileData
  onAddFriend: () => void
  onCancelRequest: () => void
  onAcceptRequest: () => void
  onDeclineRequest: () => void
  onRemoveFriend: () => void
  onMessage: () => void
  onBlock: () => void
  onUnblock: () => void
  pendingAction?: boolean
}

function fmt(n: number): string {
  return n > 999 ? '999+' : String(n)
}

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  el.focus({ preventScroll: true })
}

export function ProfileView({
  mode,
  data,
  onAddFriend,
  onCancelRequest,
  onAcceptRequest,
  onDeclineRequest,
  onRemoveFriend,
  onMessage,
  onBlock,
  onUnblock,
  pendingAction,
}: ProfileViewProps) {
  const { t } = useTranslation()
  const locale = useUIStore((s) => s.locale)
  const openCommandPalette = useUIStore((s) => s.openCommandPalette)
  const addToast = useUIStore((s) => s.addToast)
  const [expanded, setExpanded] = useState(INITIAL_EXPANDED)
  const [reportOpen, setReportOpen] = useState(false)

  const { user, stats, last_reading, public_notes, public_highlights, friends, studies, recent_likes } = data
  const isSelf = mode === 'self'

  const bibleLink = (ref: ProfileVerseRef): string | null => {
    if (!ref.book_slug || !ref.chapter) return null
    return paths.bible({ lang: locale, book: ref.book_slug, chapter: ref.chapter, verse: ref.verse ?? null })
  }

  const showLikes = mode === 'other' && data.friendship_status === 'accepted' && !!recent_likes && recent_likes.length > 0
  const otherAllEmpty =
    mode === 'other' &&
    public_notes.length === 0 &&
    public_highlights.length === 0 &&
    !showLikes &&
    friends.length === 0 &&
    studies.length === 0

  const statDefs: { key: keyof typeof stats; label: string; anchor?: string }[] = [
    { key: 'reading_streak_days', label: 'perfil.stats.streak' },
    { key: 'notes_count', label: 'perfil.stats.notes', anchor: 'notas' },
    { key: 'highlights_count', label: 'perfil.stats.highlights', anchor: 'subrayados' },
    {
      key: 'friends_count',
      label: isSelf ? 'perfil.stats.friends' : 'perfil.stats.mutualFriends',
      anchor: 'amigos',
    },
    { key: 'studies_count', label: 'perfil.stats.studies', anchor: 'estudios' },
  ]

  const visibleItems = <T,>(section: ExpandableSection, items: T[]): T[] =>
    expanded[section] ? items : items.slice(0, PREVIEW_LIMIT[section])

  const expansionControl = (section: ExpandableSection, itemCount: number) => {
    const hiddenCount = itemCount - PREVIEW_LIMIT[section]
    if (hiddenCount <= 0) return null

    return (
      <button
        type="button"
        onClick={() => setExpanded((current) => ({ ...current, [section]: !current[section] }))}
        className="mt-3 rounded-lg text-xs font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        {expanded[section] ? t('perfil.showLess') : t('perfil.showMore', { count: hiddenCount })}
      </button>
    )
  }

  const shareProfile = async () => {
    const url = new URL(paths.userProfile(user.id), window.location.origin).toString()

    if (navigator.share) {
      try {
        await navigator.share({ title: user.name, url })
        return
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      addToast(t('perfil.shareCopied'), 'success')
    } catch {
      addToast(t('perfil.shareFailed'), 'error')
    }
  }

  return (
    <div className="min-h-full bg-bg-secondary">
      <div className="workspace-page-frame mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 md:px-8 md:py-8">
        <header className="workspace-profile-header flex flex-col items-center gap-5 border-b border-border-subtle pb-7 text-center sm:flex-row sm:items-start sm:text-left md:gap-6 md:pb-8">
          <UserAvatar
            name={user.name}
            email={user.email}
            src={user.avatar_url}
            size="2xl"
            className="workspace-profile-avatar h-24 w-24 text-3xl ring-4 ring-bg-secondary shadow-sm md:h-28 md:w-28"
          />

          <div className="min-w-0 flex-1 pt-1">
            <div className="workspace-profile-identity flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="workspace-profile-title max-w-full truncate text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
                {user.name}
              </h1>
              {isSelf && user.email_verified && (
                <BadgeCheck
                  size={18}
                  strokeWidth={1.6}
                  className="shrink-0 text-accent"
                  aria-label={t('perfil.verified')}
                />
              )}
              {!isSelf && data.friendship_status === 'accepted' && (
                <span className="rounded-full border border-border-subtle px-2.5 py-1 text-2xs font-medium text-text-muted">
                  {t('perfil.friendsChip')}
                </span>
              )}
            </div>

            {(isSelf || !!user.email) && (
              <p className="mt-1 truncate text-sm text-text-muted">{user.email}</p>
            )}

            {user.bio ? (
              <p className="mx-auto mt-3 max-w-[58ch] whitespace-pre-line text-base leading-relaxed text-text-secondary sm:mx-0">
                {user.bio}
              </p>
            ) : (
              isSelf && (
                <Link to={`${paths.settings()}#cuenta`} className="mt-3 inline-block text-sm text-accent hover:underline">
                  {t('perfil.addBio')}
                </Link>
              )
            )}

            <ProfileActionBar
              mode={mode}
              status={data.friendship_status}
              busy={pendingAction}
              onAdd={onAddFriend}
              onCancel={onCancelRequest}
              onAccept={onAcceptRequest}
              onDecline={onDeclineRequest}
              onRemove={onRemoveFriend}
              onMessage={onMessage}
              onBlock={onBlock}
              onUnblock={onUnblock}
              onShare={() => {
                void shareProfile()
              }}
              onReport={!isSelf ? () => setReportOpen(true) : undefined}
            />
          </div>
        </header>

        {isSelf && (
          <section aria-labelledby="cont-lbl" className="mt-7">
            <SectionLabel id="cont-lbl">{t('perfil.continueReading')}</SectionLabel>
            {last_reading && last_reading.book_slug ? (
              <Link
                to={paths.bible({
                  lang: locale,
                  book: last_reading.book_slug,
                  chapter: last_reading.chapter,
                  verse: last_reading.verse ?? null,
                })}
                className="group mt-2 flex items-center gap-3 rounded-2xl border border-border-subtle bg-bg-secondary px-4 py-3.5 transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <BookOpen size={18} strokeWidth={1.6} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium text-text-primary">
                    {last_reading.book_name} {last_reading.chapter}:{last_reading.verse}
                  </p>
                  <p className="text-xs text-text-muted">
                    {last_reading.version ? `${last_reading.version} · ` : ''}
                    {relativeTime(last_reading.timestamp)}
                  </p>
                </div>
                <ChevronRight
                  size={17}
                  strokeWidth={1.5}
                  className="shrink-0 text-text-muted group-hover:text-text-secondary"
                />
              </Link>
            ) : (
              <div className={cn(CARD, 'mt-2 text-center')}>
                <EmptyState className="py-5" message={t('perfil.empty.noReading')} />
                <Link
                  to={paths.bible({ lang: locale, book: 'genesis', chapter: 1 })}
                  className="text-sm text-accent hover:underline"
                >
                  {t('perfil.openBible')}
                </Link>
              </div>
            )}
          </section>
        )}

        {!isSelf && last_reading?.book_slug && (
          <section aria-labelledby="friend-reading-lbl" className="mt-7">
            <SectionLabel id="friend-reading-lbl">{t('perfil.readingActivity')}</SectionLabel>
            <Link
              to={paths.bible({
                lang: locale,
                book: last_reading.book_slug,
                chapter: last_reading.chapter,
                verse: last_reading.verse ?? null,
              })}
              className="group mt-2 flex items-center gap-3 rounded-2xl border border-border-subtle bg-bg-secondary px-4 py-3.5 transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <BookOpen size={18} strokeWidth={1.6} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-text-primary">
                  {last_reading.book_name} {last_reading.chapter}:{last_reading.verse}
                </p>
                <p className="text-xs text-text-muted">
                  {last_reading.version ? `${last_reading.version} · ` : ''}
                  {relativeTime(last_reading.timestamp)}
                </p>
              </div>
              <ChevronRight size={17} strokeWidth={1.5} className="shrink-0 text-text-muted group-hover:text-text-secondary" />
            </Link>
          </section>
        )}

        <div className="workspace-profile-grid mt-7 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
          <aside className="workspace-profile-aside space-y-5 lg:order-2">
            <section aria-labelledby="stats-lbl" className={CARD}>
              <SectionLabel id="stats-lbl">{t('perfil.stats.title')}</SectionLabel>
              <ul className="workspace-profile-stats mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-2">
                {statDefs.map((s) => {
                  const cell = (
                    <span className="flex min-h-[68px] w-full flex-col items-center justify-center gap-0.5 rounded-xl bg-bg-tertiary/70 px-2 py-3">
                      <span className="text-xl font-semibold tabular-nums text-text-primary">{fmt(stats[s.key])}</span>
                      <span className="text-center text-2xs uppercase leading-tight tracking-[0.1em] text-text-muted">
                        {t(s.label as never)}
                      </span>
                    </span>
                  )

                  return (
                    <li key={s.key} className="workspace-profile-stat last:col-span-2 sm:last:col-span-1 lg:last:col-span-2">
                      {s.anchor ? (
                        <button
                          type="button"
                          onClick={() => scrollToSection(s.anchor as string)}
                          className="w-full rounded-xl transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                        >
                          {cell}
                        </button>
                      ) : (
                        cell
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>

            {isSelf && (
              <section aria-labelledby="explore-lbl" className={CARD}>
                <SectionLabel id="explore-lbl">{t('perfil.shortcuts.title')}</SectionLabel>
                <div className="mt-2 divide-y divide-border-subtle">
                  <Link
                    to={paths.marketplace()}
                    className="group flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                      <Store size={16} strokeWidth={1.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-text-primary">{t('perfil.shortcuts.marketplace')}</span>
                      <span className="block text-xs text-text-muted">{t('perfil.shortcuts.marketplaceHint')}</span>
                    </span>
                    <ChevronRight size={16} strokeWidth={1.5} className="shrink-0 text-text-muted" />
                  </Link>
                  <Link
                    to={paths.myPaths()}
                    className="group flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                      <Compass size={16} strokeWidth={1.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-text-primary">{t('perfil.shortcuts.myPaths')}</span>
                      <span className="block text-xs text-text-muted">{t('perfil.shortcuts.myPathsHint')}</span>
                    </span>
                    <ChevronRight size={16} strokeWidth={1.5} className="shrink-0 text-text-muted" />
                  </Link>
                </div>
              </section>
            )}

            {!otherAllEmpty && (
              <section id="amigos" aria-labelledby="am-lbl" tabIndex={-1} className={cn(CARD, 'scroll-mt-6')}>
                <div className="flex items-center justify-between">
                  <SectionLabel id="am-lbl">{isSelf ? t('perfil.friends.self') : t('perfil.friends.other')}</SectionLabel>
                  {stats.friends_count > 0 && (
                    <span className="text-2xs tabular-nums text-text-muted">{stats.friends_count}</span>
                  )}
                </div>

                {friends.length === 0 ? (
                  <div>
                    <EmptyState
                      className="py-7"
                      message={isSelf ? t('perfil.empty.friendsSelf', { modKey }) : t('perfil.empty.friendsOther')}
                    />
                    {isSelf && (
                      <div className="-mt-3 text-center">
                        <button type="button" onClick={openCommandPalette} className="text-sm text-accent hover:underline">
                          {t('perfil.empty.findFriends')}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <ul className="mt-2 space-y-0.5">
                      {visibleItems('friends', friends).map((friend) => (
                        <li key={friend.id}>
                          <Link
                            to={paths.userProfile(friend.id)}
                            className={cn(ROW, 'items-center gap-2.5 py-2')}
                          >
                            <UserAvatar
                              name={friend.name}
                              email={friend.email}
                              src={friend.avatar_url}
                              size="lg"
                            />
                            <span className="truncate text-sm font-medium text-text-primary">{friend.name}</span>
                            <ChevronRight size={15} strokeWidth={1.5} className="ml-auto shrink-0 text-text-muted" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {expansionControl('friends', friends.length)}
                  </>
                )}
              </section>
            )}
          </aside>

          <main className="workspace-profile-main min-w-0 space-y-5 lg:order-1">
            {otherAllEmpty ? (
              <div className={CARD}>
                <EmptyState
                  className="py-12"
                  message={
                    data.friendship_status === 'accepted'
                      ? t('perfil.empty.allPublicAccepted', { name: user.name })
                      : t('perfil.empty.allPublicStranger', { name: user.name })
                  }
                />
              </div>
            ) : (
              <>
                <section id="notas" aria-labelledby="notas-lbl" tabIndex={-1} className={cn(CARD, 'scroll-mt-6')}>
                  <div className="flex items-center justify-between">
                    <SectionLabel id="notas-lbl">{isSelf ? t('perfil.notes.self') : t('perfil.notes.other')}</SectionLabel>
                    {stats.notes_count > 0 && (
                      <span className="text-2xs tabular-nums text-text-muted">{stats.notes_count}</span>
                    )}
                  </div>
                  {public_notes.length === 0 ? (
                    <EmptyState
                      className="py-8"
                      message={isSelf ? t('perfil.empty.notesSelf') : t('perfil.empty.notesOther', { name: user.name })}
                    />
                  ) : (
                    <>
                      <ul className="mt-2 divide-y divide-border-subtle">
                        {visibleItems('notes', public_notes).map((note) => {
                          const href = bibleLink(note)
                          const inner = (
                            <>
                              <div className="flex items-center gap-2">
                                <span className={REF}>{note.verse_ref}</span>
                                <time className="text-2xs text-text-muted">{relativeTime(note.created_at)}</time>
                                {isSelf && (
                                  <span className="ml-auto text-2xs text-text-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                                    {note.is_public ? t('perfil.visibilityTag') : t('perfil.visibilityTagPrivate')}
                                  </span>
                                )}
                              </div>
                              <p className="line-clamp-2 whitespace-pre-line text-base leading-snug text-text-secondary">
                                {noteToPlainText(note.body)}
                              </p>
                            </>
                          )

                          return (
                            <li key={note.id}>
                              {href ? (
                                <Link to={href} className={cn(ROW, 'flex-col gap-1 py-3')}>
                                  {inner}
                                </Link>
                              ) : (
                                <div className="flex flex-col gap-1 px-3 py-3">{inner}</div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                      {expansionControl('notes', public_notes.length)}
                    </>
                  )}
                </section>

                <section
                  id="subrayados"
                  aria-labelledby="sub-lbl"
                  tabIndex={-1}
                  className={cn(CARD, 'scroll-mt-6')}
                >
                  <div className="flex items-center justify-between">
                    <SectionLabel id="sub-lbl">
                      {isSelf ? t('perfil.highlights.self') : t('perfil.highlights.other')}
                    </SectionLabel>
                    {stats.highlights_count > 0 && (
                      <span className="text-2xs tabular-nums text-text-muted">{stats.highlights_count}</span>
                    )}
                  </div>
                  {public_highlights.length === 0 ? (
                    <EmptyState
                      className="py-8"
                      message={
                        isSelf
                          ? t('perfil.empty.highlightsSelf')
                          : t('perfil.empty.highlightsOther', { name: user.name })
                      }
                    />
                  ) : (
                    <>
                      <ul className="mt-2 divide-y divide-border-subtle">
                        {visibleItems('highlights', public_highlights).map((highlight) => {
                          const href = bibleLink(highlight)
                          const inner = (
                            <>
                              <span
                                className={cn(
                                  'mt-1 h-3 w-1 shrink-0 rounded-full',
                                  HL_BAR[highlight.color] ?? 'bg-text-muted',
                                )}
                                aria-hidden
                              />
                              <div className="min-w-0">
                                <span className={cn(REF, 'mr-2')}>{highlight.verse_ref}</span>
                                <span className="line-clamp-2 font-reading text-base leading-snug text-text-secondary">
                                  {highlight.text}
                                </span>
                              </div>
                            </>
                          )

                          return (
                            <li key={highlight.id}>
                              {href ? (
                                <Link to={href} className={cn(ROW, 'items-start gap-2.5 py-3')}>
                                  {inner}
                                </Link>
                              ) : (
                                <div className="flex items-start gap-2.5 px-3 py-3">{inner}</div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                      {expansionControl('highlights', public_highlights.length)}
                    </>
                  )}
                </section>

                {showLikes && (
                  <section id="likes" className={cn(CARD, 'scroll-mt-6')}>
                    <SectionLabel>{t('perfil.likes')}</SectionLabel>
                    <ul className="mt-2 divide-y divide-border-subtle">
                      {visibleItems('likes', recent_likes!).map((like) => {
                        const href = bibleLink(like)
                        const inner = (
                          <>
                            <Heart size={13} className="mt-1 shrink-0 text-fav" fill="currentColor" />
                            <div className="min-w-0">
                              <span className={cn(REF, 'mr-2')}>{like.verse_ref}</span>
                              <span className="line-clamp-2 font-reading text-base leading-snug text-text-secondary">
                                {noteToPlainText(like.note_body)}
                              </span>
                              <time className="mt-0.5 block text-2xs text-text-muted">
                                {relativeTime(like.created_at)}
                              </time>
                            </div>
                          </>
                        )

                        return (
                          <li key={like.id}>
                            {href ? (
                              <Link to={href} className={cn(ROW, 'items-start gap-2.5 py-3')}>
                                {inner}
                              </Link>
                            ) : (
                              <div className="flex items-start gap-2.5 px-3 py-3">{inner}</div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                    {expansionControl('likes', recent_likes!.length)}
                  </section>
                )}

                <section
                  id="estudios"
                  aria-labelledby="est-lbl"
                  tabIndex={-1}
                  className={cn(CARD, 'scroll-mt-6')}
                >
                  <div className="flex items-center justify-between">
                    <SectionLabel id="est-lbl">
                      {isSelf ? t('perfil.studies.self') : t('perfil.studies.other')}
                    </SectionLabel>
                    {stats.studies_count > 0 && (
                      <span className="text-2xs tabular-nums text-text-muted">{stats.studies_count}</span>
                    )}
                  </div>
                  {studies.length === 0 ? (
                    <EmptyState
                      className="py-8"
                      message={isSelf ? t('perfil.empty.studiesSelf') : t('perfil.empty.studiesOther')}
                    />
                  ) : (
                    <>
                      <ul className="mt-2 divide-y divide-border-subtle">
                        {visibleItems('studies', studies).map((study) => (
                          <li key={study.id}>
                            <Link
                              to={paths.study({ sessionId: String(study.id) })}
                              className={cn(ROW, 'workspace-profile-study-row items-center gap-3 py-3')}
                            >
                              <span className="workspace-profile-study-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                                <GraduationCap size={17} strokeWidth={1.5} />
                              </span>
                              <div className="workspace-profile-study-copy min-w-0 flex-1">
                                <p className="truncate text-base font-medium text-text-primary">{study.title}</p>
                                <p className="text-2xs text-text-muted">
                                  {t('perfil.participants', { count: study.participants_count })} ·{' '}
                                  {relativeTime(study.updated_at)}
                                </p>
                              </div>
                              <span className="workspace-profile-study-status shrink-0 rounded-full border border-border-subtle px-2 py-0.5 text-2xs uppercase tracking-[0.08em] text-text-muted">
                                {study.status in STATUS_KEY
                                  ? t(STATUS_KEY[study.status as keyof typeof STATUS_KEY])
                                  : study.status}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {expansionControl('studies', studies.length)}
                    </>
                  )}
                </section>
              </>
            )}
          </main>
        </div>
      </div>
      {!isSelf && <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} target={{ type: 'user', id: String(user.id), subjectUserId: user.id }} />}
    </div>
  )
}
