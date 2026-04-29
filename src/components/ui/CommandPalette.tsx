import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Command } from 'cmdk'
import { useUIStore } from '@/lib/store/useUIStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { bibleApi, ApiSearchResult } from '@/lib/bibleApi'
import { cn } from '@/lib/cn'

export function CommandPalette() {
  const { t } = useTranslation()
  const { commandPaletteOpen, closeCommandPalette } = useUIStore()
  const { selectBook, openVerse } = useVerseStore()
  const books = useVerseStore((s) => s.books)
  const versionId = useVerseStore((s) => s.versionId)
  const [query, setQuery] = useState('')
  const [verseResults, setVerseResults] = useState<ApiSearchResult[]>([])

  useEffect(() => {
    if (!commandPaletteOpen) {
      setQuery('')
      setVerseResults([])
    }
  }, [commandPaletteOpen])

  useEffect(() => {
    if (query.length < 2) {
      setVerseResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const results = await bibleApi.search(versionId, query)
        setVerseResults(results.slice(0, 8))
      } catch {
        setVerseResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, versionId])

  if (!commandPaletteOpen) return null

  const filteredBooks = books.filter((b) =>
    b.name.toLowerCase().includes(query.toLowerCase())
  )

  const handleBookSelect = (bookId: string) => {
    selectBook(bookId)
    closeCommandPalette()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={closeCommandPalette}
      onKeyDown={(e) => { if (e.key === 'Escape') closeCommandPalette() }}
    >
      <div
        className="max-w-lg w-full bg-bg-secondary rounded-xl border border-border-subtle shadow-2xl overflow-hidden mx-4"
        onClick={(e) => e.stopPropagation()}
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
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
