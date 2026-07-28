import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, ChevronRight, GraduationCap, Heart, BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/cn'
import { modKey } from '@/lib/platform'
import { paths } from '@/router/paths'
import { relativeTime } from '@/lib/relativeTime'
import { useUIStore } from '@/lib/store/useUIStore'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProfileActionBar } from './ProfileActionBar'
import type { ProfileData, ProfileMode, ProfileVerseRef } from '@/types'

const HL_BAR: Record<string, string> = {
  yellow: 'bg-[#e5c07b]',
  blue: 'bg-[#61afef]',
  green: 'bg-[#98c379]',
}

const ROW = 'group flex -mx-2 rounded-md px-2 transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50'
const REF = 'text-2xs font-semibold uppercase tracking-[0.08em] text-accent'

const STATUS_KEY = {
  active: 'study.status.active',
  ended: 'study.status.ended',
  archived: 'study.status.archived',
  draft: 'study.status.draft',
} as const

export interface ProfileViewProps {
  mode: ProfileMode
  data: ProfileData
  onAddFriend: () => void
  onCancelRequest: () => void
  onAcceptRequest: () => void
  onDeclineRequest: () => void
  onRemoveFriend: () => void
  onMessage: () => void
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
  pendingAction,
}: ProfileViewProps) {
  const { t } = useTranslation()
  const locale = useUIStore((s) => s.locale)
  const openCommandPalette = useUIStore((s) => s.openCommandPalette)
  const [showAllFriends, setShowAllFriends] = useState(false)

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

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-6 md:px-8 md:py-8 flex flex-col gap-7">
      {/* ── Identity ─────────────────────────────────────────────── */}
      <header className="flex flex-col items-center text-center gap-3 md:flex-row md:items-start md:text-left md:gap-4">
        <UserAvatar
          name={user.name}
          email={user.email}
          src={user.avatar_url}
          size="2xl"
          className="md:w-16 md:h-16 md:text-xl"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <h1 className="text-lg font-semibold text-text-primary truncate">{user.name}</h1>
            {isSelf && user.email_verified && (
              <BadgeCheck size={15} strokeWidth={1.5} className="text-accent shrink-0" aria-label={t('perfil.verified')} />
            )}
            {!isSelf && data.friendship_status === 'accepted' && (
              <span className="text-2xs text-text-muted border border-border-subtle rounded px-1.5 py-0.5">
                {t('perfil.friendsChip')}
              </span>
            )}
          </div>
          {(isSelf || !!user.email) && <p className="text-sm text-text-muted truncate">{user.email}</p>}
          {user.bio ? (
            <p className="mt-2 text-base text-text-secondary leading-snug whitespace-pre-line max-w-[52ch]">
              {user.bio}
            </p>
          ) : (
            isSelf && (
              <Link to={`${paths.settings()}#cuenta`} className="mt-2 inline-block text-sm text-accent hover:underline">
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
          />
        </div>
      </header>

      {/* ── Continuar leyendo (self) ─────────────────────────────── */}
      {isSelf && (
        <section aria-labelledby="cont-lbl">
          <SectionLabel id="cont-lbl">{t('perfil.continueReading')}</SectionLabel>
          {last_reading && last_reading.book_slug ? (
            <Link
              to={paths.bible({
                lang: locale,
                book: last_reading.book_slug,
                chapter: last_reading.chapter,
                verse: last_reading.verse ?? null,
              })}
              className="group mt-2 flex items-center gap-3 rounded-lg border border-border-subtle px-4 py-3 hover:bg-bg-tertiary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 text-accent shrink-0">
                <BookOpen size={16} strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base text-text-primary font-medium truncate">
                  {last_reading.book_name} {last_reading.chapter}:{last_reading.verse}
                </p>
                <p className="text-xs text-text-muted">
                  {last_reading.version ? `${last_reading.version} · ` : ''}
                  {relativeTime(last_reading.timestamp)}
                </p>
              </div>
              <ChevronRight size={16} strokeWidth={1.5} className="text-text-muted group-hover:text-text-secondary shrink-0" />
            </Link>
          ) : (
            <div className="mt-2">
              <EmptyState className="py-8" message={t('perfil.empty.noReading')} />
              <div className="text-center -mt-4">
                <Link
                  to={paths.bible({ lang: locale, book: 'genesis', chapter: 1 })}
                  className="text-sm text-accent hover:underline"
                >
                  {t('perfil.openBible')}
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Estadísticas ─────────────────────────────────────────── */}
      <section aria-labelledby="stats-lbl">
        <SectionLabel id="stats-lbl">{t('perfil.stats.title')}</SectionLabel>
        <ul className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
          {statDefs.map((s) => {
            const cell = (
              <span className="flex w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-border-subtle py-3 px-1">
                <span className="text-lg font-semibold text-text-primary tabular-nums">{fmt(stats[s.key])}</span>
                <span className="text-2xs uppercase tracking-[0.1em] text-text-muted text-center leading-tight">
                  {t(s.label as never)}
                </span>
              </span>
            )
            return (
              <li key={s.key}>
                {s.anchor ? (
                  <button
                    type="button"
                    onClick={() => scrollToSection(s.anchor as string)}
                    className="w-full rounded-lg hover:bg-bg-tertiary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [&>span]:hover:bg-transparent"
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

      {otherAllEmpty ? (
        <EmptyState
          className="py-16"
          message={
            data.friendship_status === 'accepted'
              ? t('perfil.empty.allPublicAccepted', { name: user.name })
              : t('perfil.empty.allPublicStranger', { name: user.name })
          }
        />
      ) : (
        <>
          {/* ── Notas ─────────────────────────────────────────────── */}
          <section id="notas" aria-labelledby="notas-lbl" tabIndex={-1} className="scroll-mt-6">
            <div className="flex items-center justify-between">
              <SectionLabel id="notas-lbl">{isSelf ? t('perfil.notes.self') : t('perfil.notes.other')}</SectionLabel>
              {public_notes.length > 0 && (
                <span className="text-2xs text-text-muted tabular-nums">{public_notes.length}</span>
              )}
            </div>
            {public_notes.length === 0 ? (
              <EmptyState className="py-8" message={isSelf ? t('perfil.empty.notesSelf') : t('perfil.empty.notesOther', { name: user.name })} />
            ) : (
              <ul className="mt-2 divide-y divide-border-subtle">
                {public_notes.map((n) => {
                  const href = bibleLink(n)
                  const inner = (
                    <>
                      <div className="flex items-center gap-2">
                        <span className={REF}>{n.verse_ref}</span>
                        <time className="text-2xs text-text-muted">{relativeTime(n.created_at)}</time>
                        {isSelf && (
                          <span className="ml-auto text-2xs text-text-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                            {n.is_public ? t('perfil.visibilityTag') : t('perfil.visibilityTagPrivate')}
                          </span>
                        )}
                      </div>
                      <p className="text-base text-text-secondary leading-snug line-clamp-2 whitespace-pre-line">{n.body}</p>
                    </>
                  )
                  return (
                    <li key={n.id}>
                      {href ? (
                        <Link to={href} className={cn(ROW, 'flex-col gap-1 py-2.5')}>{inner}</Link>
                      ) : (
                        <div className="flex flex-col gap-1 py-2.5 px-2 -mx-2">{inner}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* ── Subrayados ────────────────────────────────────────── */}
          <section id="subrayados" aria-labelledby="sub-lbl" tabIndex={-1} className="scroll-mt-6">
            <div className="flex items-center justify-between">
              <SectionLabel id="sub-lbl">{isSelf ? t('perfil.highlights.self') : t('perfil.highlights.other')}</SectionLabel>
              {public_highlights.length > 0 && (
                <span className="text-2xs text-text-muted tabular-nums">{public_highlights.length}</span>
              )}
            </div>
            {public_highlights.length === 0 ? (
              <EmptyState className="py-8" message={isSelf ? t('perfil.empty.highlightsSelf') : t('perfil.empty.highlightsOther', { name: user.name })} />
            ) : (
              <ul className="mt-2 divide-y divide-border-subtle">
                {public_highlights.map((h) => {
                  const href = bibleLink(h)
                  const inner = (
                    <>
                      <span className={cn('mt-1 h-3 w-1 rounded-full shrink-0', HL_BAR[h.color] ?? 'bg-text-muted')} aria-hidden />
                      <div className="min-w-0">
                        <span className={cn(REF, 'mr-2')}>{h.verse_ref}</span>
                        <span className="font-reading text-base text-text-secondary leading-snug line-clamp-2">{h.text}</span>
                      </div>
                    </>
                  )
                  return (
                    <li key={h.id}>
                      {href ? (
                        <Link to={href} className={cn(ROW, 'items-start gap-2.5 py-2.5')}>{inner}</Link>
                      ) : (
                        <div className="flex items-start gap-2.5 py-2.5 px-2 -mx-2">{inner}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* ── Le ha gustado (other + accepted) ──────────────────── */}
          {showLikes && (
            <section id="likes" className="scroll-mt-6">
              <SectionLabel>{t('perfil.likes')}</SectionLabel>
              <ul className="mt-2 divide-y divide-border-subtle">
                {recent_likes!.map((l) => {
                  const href = bibleLink(l)
                  const inner = (
                    <>
                      <Heart size={13} className="mt-1 text-fav shrink-0" fill="currentColor" />
                      <div className="min-w-0">
                        <span className={cn(REF, 'mr-2')}>{l.verse_ref}</span>
                        <span className="font-reading text-base text-text-secondary leading-snug line-clamp-2">{l.note_body}</span>
                        <time className="block text-2xs text-text-muted mt-0.5">{relativeTime(l.created_at)}</time>
                      </div>
                    </>
                  )
                  return (
                    <li key={l.id}>
                      {href ? (
                        <Link to={href} className={cn(ROW, 'items-start gap-2.5 py-2.5')}>{inner}</Link>
                      ) : (
                        <div className="flex items-start gap-2.5 py-2.5 px-2 -mx-2">{inner}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {/* ── Amigos ────────────────────────────────────────────── */}
          <section id="amigos" aria-labelledby="am-lbl" tabIndex={-1} className="scroll-mt-6">
            <div className="flex items-center justify-between">
              <SectionLabel id="am-lbl">{isSelf ? t('perfil.friends.self') : t('perfil.friends.other')}</SectionLabel>
              {friends.length > 0 && <span className="text-2xs text-text-muted tabular-nums">{friends.length}</span>}
            </div>
            {friends.length === 0 ? (
              <div>
                <EmptyState className="py-8" message={isSelf ? t('perfil.empty.friendsSelf', { modKey }) : t('perfil.empty.friendsOther')} />
                {isSelf && (
                  <div className="text-center -mt-4">
                    <button type="button" onClick={openCommandPalette} className="text-sm text-accent hover:underline">
                      {t('perfil.empty.findFriends')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  {(showAllFriends ? friends : friends.slice(0, 8)).map((f) => (
                    <li key={f.id}>
                      <Link to={paths.userProfile(f.id)} className={cn(ROW, 'items-center gap-2.5 py-2 md:py-1.5')}>
                        <UserAvatar name={f.name} email={f.email} src={f.avatar_url} size="md" />
                        <span className="text-base text-text-primary truncate">{f.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {friends.length > 8 && (
                  <button
                    type="button"
                    onClick={() => setShowAllFriends((v) => !v)}
                    className="mt-2 text-xs text-text-muted hover:text-text-primary"
                  >
                    {showAllFriends ? t('perfil.showLess') : t('perfil.seeAllFriends', { count: friends.length })}
                  </button>
                )}
              </>
            )}
          </section>

          {/* ── Estudios ──────────────────────────────────────────── */}
          <section id="estudios" aria-labelledby="est-lbl" tabIndex={-1} className="scroll-mt-6">
            <SectionLabel id="est-lbl">{isSelf ? t('perfil.studies.self') : t('perfil.studies.other')}</SectionLabel>
            {studies.length === 0 ? (
              <EmptyState className="py-8" message={isSelf ? t('perfil.empty.studiesSelf') : t('perfil.empty.studiesOther')} />
            ) : (
              <ul className="mt-2 divide-y divide-border-subtle">
                {studies.map((s) => (
                  <li key={s.id}>
                    <Link to={paths.study({ sessionId: String(s.id) })} className={cn(ROW, 'items-center gap-3 py-2.5')}>
                      <GraduationCap size={16} strokeWidth={1.5} className="text-text-muted shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-base text-text-primary truncate">{s.title}</p>
                        <p className="text-2xs text-text-muted">
                          {t('perfil.participants', { count: s.participants_count })} · {relativeTime(s.updated_at)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-border-subtle px-2 py-0.5 text-2xs uppercase tracking-[0.08em] text-text-muted">
                        {s.status in STATUS_KEY ? t(STATUS_KEY[s.status as keyof typeof STATUS_KEY]) : s.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
