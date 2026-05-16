import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '@/lib/store/useUIStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { bibleApi, ApiSearchResult } from '@/lib/bibleApi'
import { normalizeText } from '@/lib/normalizeText'
import { parseReferenceQuery, findBookMatches } from '@/lib/verseSearch'
import { BOOK_ALIASES } from '@/lib/bibleRefs'
import type { Book } from '@/lib/store/useVerseStore'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'

type Scope = 'all' | 'bible' | 'notes' | 'people'

interface UserNote {
  id: number
  body: string
  verse: {
    number: number
    chapter: number
    book: string
    slug: string
  }
}

export function MobileSearchView() {
  const { t } = useTranslation()
  const mobileSearchOpen = useUIStore((s) => s.mobileSearchOpen)
  const closeMobileSearch = useUIStore((s) => s.closeMobileSearch)
  const addToast = useUIStore((s) => s.addToast)
  const versionId = useVerseStore((s) => s.versionId)
  const openVerse = useVerseStore((s) => s.openVerse)
  const books = useVerseStore((s) => s.books)
  const user = useAuthStore((s) => s.user)
  const searchUsers = useFriendStore((s) => s.searchUsers)
  const clearSearch = useFriendStore((s) => s.clearSearch)
  const peopleResults = useFriendStore((s) => s.searchResults)
  const peopleSearching = useFriendStore((s) => s.isSearching)
  const sendRequest = useFriendStore((s) => s.sendRequest)
  const sent = useFriendStore((s) => s.sent)
  const friends = useFriendStore((s) => s.friends)

  const [scope, setScope] = useState<Scope>('bible')
  const [query, setQuery] = useState('')
  const [verseResults, setVerseResults] = useState<ApiSearchResult[]>([])
  const [verseSearching, setVerseSearching] = useState(false)
  const [allNotes, setAllNotes] = useState<UserNote[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mobileSearchOpen) {
      const id = setTimeout(() => inputRef.current?.focus(), 200)
      return () => clearTimeout(id)
    }
  }, [mobileSearchOpen])

  useEffect(() => {
    if (!mobileSearchOpen || !user || allNotes.length > 0) return
    api.get<UserNote[]>('/api/user/notes').then(setAllNotes).catch(() => {})
  }, [mobileSearchOpen, user, allNotes.length])

  const needsBible = scope === 'bible' || scope === 'all'
  const needsPeople = scope === 'people' || scope === 'all'

  useEffect(() => {
    if (!needsBible || query.trim().length < 2) {
      setVerseResults([])
      return
    }
    setVerseSearching(true)
    const id = setTimeout(async () => {
      try {
        const results = await bibleApi.search(versionId, normalizeText(query))
        setVerseResults(results.slice(0, scope === 'all' ? 5 : 30))
      } catch {
        setVerseResults([])
      } finally {
        setVerseSearching(false)
      }
    }, 300)
    return () => clearTimeout(id)
  }, [query, versionId, needsBible, scope])

  useEffect(() => {
    if (!needsPeople || query.trim().length < 2) {
      clearSearch()
      return
    }
    const id = setTimeout(() => {
      searchUsers(query)
    }, 300)
    return () => clearTimeout(id)
  }, [query, needsPeople, searchUsers, clearSearch])

  // Parsed reference ("john 3:16", "juan 3", "gen 1:1") — synchronous, no
  // network. Rendered as the top "Go to" hit when the query parses AND the
  // numeric bounds are plausible: chapter must exist in the book, verse must
  // fit within the longest chapter in the Bible (Psalm 119, 176 verses).
  const parsedRef = useMemo(() => {
    if (!needsBible) return null
    const ref = parseReferenceQuery(query.trim())
    if (!ref) return null

    const book =
      books.find((b) => b.slug === ref.slug) ??
      books.find(
        (b) => BOOK_ALIASES[normalizeText(b.name).trim()] === ref.slug,
      )
    if (ref.chapter < 1) return null
    if (book && ref.chapter > book.chapters) return null
    if (ref.verse !== null && (ref.verse < 1 || ref.verse > 176)) return null
    return ref
  }, [query, needsBible, books])

  // Book-name matches (multilingual via BOOK_ALIASES). Suppressed when
  // the query already parses as a chapter/verse reference, since the
  // parsed-ref result is more specific.
  const bookMatches = useMemo<Book[]>(() => {
    if (!needsBible || parsedRef || books.length === 0) return []
    return findBookMatches(query, books, scope === 'all' ? 4 : 8)
  }, [needsBible, parsedRef, query, books, scope])

  // Resolve the parsed-ref slug (canonical English) back to the user's
  // version-specific book so we can display its localized name. Spanish
  // RVR uses 'juan' as the slug, English uses 'john' — match by name
  // alias if slug doesn't match directly.
  const parsedRefBook = useMemo<Book | null>(() => {
    if (!parsedRef) return null
    const direct = books.find((b) => b.slug === parsedRef.slug)
    if (direct) return direct
    return (
      books.find(
        (b) => BOOK_ALIASES[normalizeText(b.name).trim()] === parsedRef.slug,
      ) ?? null
    )
  }, [parsedRef, books])

  const noteResults = useMemo(() => {
    if (scope !== 'notes' && scope !== 'all') return []
    const q = normalizeText(query.trim())
    if (q.length < 2) return []
    return allNotes
      .filter((n) => normalizeText(n.body).includes(q))
      .slice(0, scope === 'all' ? 5 : 50)
  }, [allNotes, query, scope])

  const sentIds = useMemo(() => new Set(sent.map((r) => r.friend_id)), [sent])
  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends])

  const handleVerseClick = (v: ApiSearchResult) => {
    void openVerse(v.slug, v.chapter, v.verse)
    closeMobileSearch()
  }

  const handleBookClick = (b: Book) => {
    void openVerse(b.slug, 1, 1)
    closeMobileSearch()
  }

  const handleParsedRefClick = () => {
    if (!parsedRef) return
    void openVerse(parsedRef.slug, parsedRef.chapter, parsedRef.verse ?? 1)
    closeMobileSearch()
  }

  const handleNoteClick = (n: UserNote) => {
    void openVerse(n.verse.slug, n.verse.chapter, n.verse.number)
    closeMobileSearch()
  }

  const handleSendRequest = async (userId: number, name: string) => {
    try {
      await sendRequest(userId)
      addToast(t('friends.requestSentTo', { name }), 'success')
    } catch {
      addToast(t('friends.requestFailed'), 'error')
    }
  }

  const trimmedQuery = query.trim()
  const queryActive = trimmedQuery.length >= 2
  const showingPeople = scope === 'people' || scope === 'all'
  const isSearching = (needsBible && verseSearching) || (showingPeople && peopleSearching)
  const peopleToShow = showingPeople ? (scope === 'all' ? peopleResults.slice(0, 5) : peopleResults) : []
  const totalResults =
    verseResults.length +
    noteResults.length +
    peopleToShow.length +
    (parsedRef ? 1 : 0) +
    bookMatches.length

  if (!mobileSearchOpen) return null

  const chips: { value: Scope; label: string }[] = [
    { value: 'all', label: t('search.scope.all') },
    { value: 'bible', label: t('search.scope.bible') },
    { value: 'notes', label: t('search.scope.notes') },
    { value: 'people', label: t('search.scope.people') },
  ]

  return (
    <div className="flex h-full flex-col bg-bg-secondary">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle bg-bg-secondary px-2">
        <button
          type="button"
          onClick={closeMobileSearch}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
          aria-label={t('search.back')}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
            <path d="M10 3l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="relative flex-1">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none">
            <circle cx="7" cy="7" r="4.25" />
            <path d="M10.5 10.5L13.5 13.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="w-full h-11 rounded-md bg-bg-tertiary border border-border-subtle pl-9 pr-3 text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </header>

      <div className="shrink-0 flex gap-2 overflow-x-auto px-3 py-3 border-b border-border-subtle bg-bg-secondary">
        {chips.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setScope(c.value)}
            aria-pressed={scope === c.value}
            className={cn(
              'shrink-0 h-10 px-4 rounded-full border text-sm font-medium transition-colors',
              scope === c.value
                ? 'bg-accent text-bg-primary border-accent'
                : 'bg-bg-secondary border-border-subtle text-text-secondary hover:text-text-primary',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {!queryActive && (
          <p className="px-6 pt-10 text-center text-sm text-text-muted">{t('search.empty')}</p>
        )}

        {queryActive && isSearching && totalResults === 0 && (
          <p className="px-6 pt-10 text-center text-sm text-text-muted">{t('search.searching')}</p>
        )}

        {queryActive && !isSearching && totalResults === 0 && (
          <p className="px-6 pt-10 text-center text-sm text-text-muted">{t('search.noResults')}</p>
        )}

        {needsBible && parsedRef && (
          <section>
            <ul className="divide-y divide-border-subtle">
              <li>
                <button
                  type="button"
                  onClick={handleParsedRefClick}
                  className="w-full px-4 py-3 text-left hover:bg-bg-tertiary transition-colors flex items-center gap-3"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] text-text-primary truncate capitalize">
                      {(parsedRefBook?.name ?? parsedRef.slug.replace(/-/g, ' '))} {parsedRef.chapter}
                      {parsedRef.verse !== null ? `:${parsedRef.verse}` : ''}
                    </p>
                    <p className="text-xs text-text-muted">{t('search.goTo', 'Ir a referencia')}</p>
                  </div>
                </button>
              </li>
            </ul>
          </section>
        )}

        {needsBible && bookMatches.length > 0 && (
          <section>
            {scope === 'all' && (
              <h2 className="px-4 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                {t('search.scope.books', 'Libros')}
              </h2>
            )}
            <ul className="divide-y divide-border-subtle">
              {bookMatches.map((b) => (
                <li key={b.slug}>
                  <button
                    type="button"
                    onClick={() => handleBookClick(b)}
                    className="w-full px-4 py-3 text-left hover:bg-bg-tertiary transition-colors"
                  >
                    <p className="text-[15px] text-text-primary capitalize">{b.name}</p>
                    <p className="text-xs text-text-muted">
                      {t('search.chapters', { count: b.chapters, defaultValue: '{{count}} capítulos' })}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {needsBible && verseResults.length > 0 && (
          <section>
            {scope === 'all' && (
              <h2 className="px-4 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                {t('search.scope.bible')}
              </h2>
            )}
            <ul className="divide-y divide-border-subtle">
              {verseResults.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => handleVerseClick(v)}
                    className="w-full px-4 py-3 text-left hover:bg-bg-tertiary transition-colors"
                  >
                    <p className="text-xs text-text-muted capitalize">
                      {v.book} {v.chapter}:{v.verse}
                    </p>
                    <p className="mt-0.5 text-[15px] text-text-primary line-clamp-2">{v.text}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(scope === 'notes' || scope === 'all') && noteResults.length > 0 && (
          <section>
            {scope === 'all' && (
              <h2 className="px-4 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                {t('search.scope.notes')}
              </h2>
            )}
            <ul className="divide-y divide-border-subtle">
              {noteResults.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleNoteClick(n)}
                    className="w-full px-4 py-3 text-left hover:bg-bg-tertiary transition-colors"
                  >
                    <p className="text-xs text-text-muted capitalize">
                      {n.verse.book} {n.verse.chapter}:{n.verse.number}
                    </p>
                    <p className="mt-0.5 text-[15px] text-text-primary line-clamp-2">{n.body}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {showingPeople && peopleToShow.length > 0 && (
          <section>
            {scope === 'all' && (
              <h2 className="px-4 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                {t('search.scope.people')}
              </h2>
            )}
            <ul className="divide-y divide-border-subtle">
              {peopleToShow.map((u) => {
                const isFriend = friendIds.has(u.id)
                const isPending = sentIds.has(u.id)
                return (
                  <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-full bg-bg-tertiary border border-border-subtle flex items-center justify-center text-sm text-text-secondary font-medium shrink-0">
                      {(u.name.charAt(0) || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] text-text-primary truncate">{u.name}</p>
                      <p className="text-xs text-text-muted truncate">{u.email}</p>
                    </div>
                    {isFriend ? (
                      <span className="text-xs text-text-muted shrink-0">{t('friends.alreadyFriends')}</span>
                    ) : isPending ? (
                      <span className="text-xs text-text-muted italic shrink-0">{t('friends.requestSent')}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendRequest(u.id, u.name)}
                        className="shrink-0 h-9 px-3 rounded-md border border-border-subtle text-sm text-text-secondary hover:text-accent hover:border-accent transition-colors"
                      >
                        {t('friends.add')}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
