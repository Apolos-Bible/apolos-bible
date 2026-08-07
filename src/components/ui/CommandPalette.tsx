import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { Command } from 'cmdk'
import { User, Settings, LogOut } from 'lucide-react'
import { useUIStore } from '@/lib/store/useUIStore'
import { getVerseStoreForTab, useVerseStore } from '@/lib/store/useVerseStore'
import { findWorkspaceGroup, useWorkspaceStore } from '@/lib/store/useWorkspaceStore'
import { useIsMobile } from '@/lib/useIsMobile'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { bibleApi, ApiSearchResult } from '@/lib/bibleApi'
import { friendApi } from '@/lib/friendApi'
import { paths } from '@/router/paths'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { Dialog } from '@/components/ui/Dialog'
import { normalizeText } from '@/lib/normalizeText'
import { cn } from '@/lib/cn'
import type { Friend } from '@/types'

export function CommandPalette() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { commandPaletteOpen, closeCommandPalette } = useUIStore()
  const isMobile = useIsMobile()
  const workspaceLayout = useWorkspaceStore((s) => s.layout)
  const activeGroupId = useWorkspaceStore((s) => s.activeGroupId)
  const activeTabId = findWorkspaceGroup(workspaceLayout, activeGroupId)?.activeTabId
  const verseStore = !isMobile && activeTabId ? getVerseStoreForTab(activeTabId) : useVerseStore
  const selectBook = useStore(verseStore, (s) => s.selectBook)
  const openVerse = useStore(verseStore, (s) => s.openVerse)
  const books = useStore(verseStore, (s) => s.books)
  const versionId = useStore(verseStore, (s) => s.versionId)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [query, setQuery] = useState('')
  const [verseResults, setVerseResults] = useState<ApiSearchResult[]>([])
  const [people, setPeople] = useState<Friend[]>([])

  useEffect(() => {
    if (!commandPaletteOpen) {
      setQuery('')
      setVerseResults([])
      setPeople([])
    }
  }, [commandPaletteOpen])

  useEffect(() => {
    if (query.length < 2) {
      setVerseResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const results = await bibleApi.search(versionId, normalizeText(query))
        setVerseResults(results.slice(0, 8))
      } catch {
        setVerseResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, versionId])

  useEffect(() => {
    if (!user || query.trim().length < 2) {
      setPeople([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        setPeople((await friendApi.search(query)).slice(0, 6))
      } catch {
        setPeople([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, user])

  if (!commandPaletteOpen) return null

  const filteredBooks = books.filter((b) =>
    normalizeText(b.name).includes(normalizeText(query))
  )

  const runNav = (to: string) => {
    closeCommandPalette()
    navigate(to)
  }

  const accountCommands = user
    ? [
        { id: 'profile', label: t('command.myProfile'), icon: <User size={14} strokeWidth={1.6} />, run: () => runNav(paths.profile()) },
        { id: 'settings', label: t('command.settings'), icon: <Settings size={14} strokeWidth={1.6} />, run: () => runNav(paths.settings()) },
        { id: 'signout', label: t('command.signOut'), icon: <LogOut size={14} strokeWidth={1.6} />, run: () => { closeCommandPalette(); void logout(); navigate(paths.root()) } },
      ].filter((c) => normalizeText(c.label).includes(normalizeText(query)))
    : []

  const handleBookSelect = (bookId: string) => {
    selectBook(bookId)
    closeCommandPalette()
  }

  return (
    <Dialog
      open={commandPaletteOpen}
      onClose={closeCommandPalette}
      label={t('commandPalette.title')}
      className="max-w-lg w-full bg-bg-secondary rounded-xl border border-border-subtle shadow-2xl overflow-hidden mx-4"
      initialFocus="[cmdk-input]"
    >
        <Command shouldFilter={false}>
          <div className="flex items-center border-b border-border-subtle">
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={t('commandPalette.placeholder')}
              autoFocus
              className="text-md text-text-primary bg-transparent flex-1 px-4 py-3 outline-none placeholder:text-text-muted"
            />
            <button
              onClick={closeCommandPalette}
              aria-label={t('common.close')}
              className="px-3 text-text-muted hover:text-text-primary transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          </div>

          <Command.List className="max-h-80 overflow-y-auto py-1">
            <Command.Empty className="text-sm text-text-muted text-center py-6">
              {t('commandPalette.noResults')}
            </Command.Empty>

            {accountCommands.length > 0 && (
              <Command.Group
                heading={
                  <span className="px-4 py-1.5 text-2xs font-medium text-text-muted uppercase tracking-wider block">
                    {t('command.account')}
                  </span>
                }
              >
                {accountCommands.map((c) => (
                  <Command.Item
                    key={c.id}
                    value={`__account_${c.id} ${c.label}`}
                    onSelect={c.run}
                    onClick={c.run}
                    className={cn(
                      'px-4 py-2 cursor-pointer text-sm text-text-secondary',
                      'hover:bg-bg-tertiary hover:text-text-primary',
                      'aria-selected:bg-bg-tertiary aria-selected:text-text-primary',
                      'flex items-center gap-2 transition-colors',
                    )}
                  >
                    <span className="text-text-muted">{c.icon}</span>
                    <span>{c.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {filteredBooks.length > 0 && (
              <Command.Group
                heading={
                  <span className="px-4 py-1.5 text-2xs font-medium text-text-muted uppercase tracking-wider block">
                    {t('commandPalette.books')}
                  </span>
                }
              >
                {filteredBooks.map((book) => (
                  <Command.Item
                    key={book.id}
                    value={book.name}
                    onSelect={() => handleBookSelect(book.id)}
                    onClick={() => handleBookSelect(book.id)}
                    className={cn(
                      'px-4 py-2 cursor-pointer text-sm text-text-secondary',
                      'hover:bg-bg-tertiary hover:text-text-primary',
                      'aria-selected:bg-bg-tertiary aria-selected:text-text-primary',
                      'flex items-center gap-2 transition-colors'
                    )}
                  >
                    <span className="text-accent text-xs">§</span>
                    <span>{book.name}</span>
                    <span className="ml-auto text-2xs text-text-muted">
                      {book.testament === 'old' ? t('commandPalette.oldTestament') : t('commandPalette.newTestament')} · {book.chapters} {t('commandPalette.chapters')}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {verseResults.length > 0 && (
              <Command.Group
                heading={
                  <span className="px-4 py-1.5 text-2xs font-medium text-text-muted uppercase tracking-wider block">
                    {t('commandPalette.verses')}
                  </span>
                }
              >
                {verseResults.map((verse) => (
                  <Command.Item
                    key={verse.id}
                    value={`${verse.book} ${verse.chapter}:${verse.verse} ${verse.text}`}
                    onSelect={() => {
                      void openVerse(verse.slug, verse.chapter, verse.verse)
                      closeCommandPalette()
                    }}
                    onClick={() => {
                      void openVerse(verse.slug, verse.chapter, verse.verse)
                      closeCommandPalette()
                    }}
                    className={cn(
                      'px-4 py-2 cursor-pointer text-sm text-text-secondary',
                      'hover:bg-bg-tertiary hover:text-text-primary',
                      'aria-selected:bg-bg-tertiary aria-selected:text-text-primary',
                      'flex items-center gap-2 transition-colors'
                    )}
                  >
                    <span className="text-accent shrink-0 text-xs">✦</span>
                    <span className="flex flex-col min-w-0">
                      <span className="text-text-muted text-2xs capitalize">
                        {verse.book} {verse.chapter}:{verse.verse}
                      </span>
                      <span className="truncate">
                        {verse.text.length > 72
                          ? verse.text.slice(0, 72) + '…'
                          : verse.text}
                      </span>
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {people.length > 0 && (
              <Command.Group
                heading={
                  <span className="px-4 py-1.5 text-2xs font-medium text-text-muted uppercase tracking-wider block">
                    {t('command.people')}
                  </span>
                }
              >
                {people.map((p) => (
                  <Command.Item
                    key={`person-${p.id}`}
                    value={`__person_${p.id} ${p.name} ${p.email}`}
                    onSelect={() => runNav(paths.userProfile(p.id))}
                    onClick={() => runNav(paths.userProfile(p.id))}
                    className={cn(
                      'px-4 py-2 cursor-pointer text-sm text-text-secondary',
                      'hover:bg-bg-tertiary hover:text-text-primary',
                      'aria-selected:bg-bg-tertiary aria-selected:text-text-primary',
                      'flex items-center gap-2 transition-colors',
                    )}
                  >
                    <UserAvatar name={p.name} email={p.email} src={p.avatar_url} size="md" />
                    <span className="flex flex-col min-w-0">
                      <span className="truncate text-text-primary">{p.name}</span>
                      <span className="truncate text-2xs text-text-muted">{p.email}</span>
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
    </Dialog>
  )
}
