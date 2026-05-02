import { useEffect, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Check, Plus } from 'lucide-react'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useBiblePreviewStore } from '@/lib/store/useBiblePreviewStore'
import { cn } from '@/lib/cn'
import type { Book } from '@/lib/store/useVerseStore'

interface BiblePanelProps {
  open: boolean
  onClose: () => void
}

export function BiblePanel({ open, onClose }: BiblePanelProps) {
  const books = useVerseStore(s => s.books)
  const {
    bookSlug, bookName, chapter, verses,
    selectedIds, loading,
    loadChapter, setChapter, toggleVerse, clearSelection,
  } = useBiblePreviewStore()

  const [bookSelectorOpen, setBookSelectorOpen] = useState(false)
  const [testamentTab, setTestamentTab] = useState<'old' | 'new'>('new')

  // Auto-load Genesis 1 on first open
  useEffect(() => {
    if (open && !bookSlug && books.length > 0) {
      const gen = books.find(b => b.slug === 'genesis') ?? books[0]
      loadChapter(gen.slug, 1)
    }
  }, [open, bookSlug, books, loadChapter])

  const selectedCount = selectedIds.size
  const selectedVerses = verses.filter(v => selectedIds.has(v.id))

  const handleAddToCanvas = useCallback(() => {
    if (selectedCount === 0) return
    const data = selectedVerses.map(v => ({
      verseId: v.apiId,
      reference: `${bookName} ${chapter}:${v.verse}`,
      version_id: useVerseStore.getState().versionId,
      verse: v.verse,
      text: v.text,
    }))
    ;(window as any).__studyCanvasActions?.addPassageNode?.({
      bookSlug: bookSlug!,
      chapter,
      reference: bookSlug ? `${bookName} ${chapter}:${selectedVerses[0].verse}-${selectedVerses[selectedVerses.length - 1].verse}` : '',
      version_id: useVerseStore.getState().versionId,
      verses: data,
    })
    clearSelection()
  }, [selectedCount, selectedVerses, bookName, chapter, bookSlug, clearSelection])

  const handleBookSelect = useCallback((book: Book) => {
    setBookSelectorOpen(false)
    loadChapter(book.slug, 1)
    clearSelection()
  }, [loadChapter, clearSelection])

  const oldTestament = books.filter(b => b.testament === 'old')
  const newTestament = books.filter(b => b.testament === 'new')
  const filteredBooks = testamentTab === 'old' ? oldTestament : newTestament

  const currentBook = books.find(b => b.slug === bookSlug)
  const totalChapters = currentBook?.chapters ?? 1

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div className="absolute inset-0 z-[15] bg-black/50 md:hidden" onClick={onClose} />
      )}

      {/* Desktop: slide-in panel */}
      <aside
        className={cn(
          'absolute inset-y-0 left-0 z-20 bg-bg-secondary border-r border-border flex flex-col',
          'transition-all duration-300 ease-in-out',
          'hidden md:flex', // desktop only
          open ? 'w-panel opacity-100' : 'w-0 opacity-0 border-0 pointer-events-none',
        )}
      >
        <div className="w-panel h-full flex flex-col shrink-0">
          {/* Header */}
          <div className="h-12 shrink-0 border-b border-border flex items-center gap-2 px-3">
            <button
              onClick={() => setBookSelectorOpen(!bookSelectorOpen)}
              className="text-sm font-medium text-text-primary hover:text-accent transition-colors truncate"
            >
              {bookName || 'Select book'}
            </button>
            <div className="flex-1" />
            <button
              onClick={() => { if (chapter > 1) setChapter(chapter - 1) }}
              disabled={chapter <= 1}
              className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-text-muted w-8 text-center">{chapter}</span>
            <button
              onClick={() => { if (chapter < totalChapters) setChapter(chapter + 1) }}
              disabled={chapter >= totalChapters}
              className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Book selector dropdown */}
          {bookSelectorOpen && (
            <div className="absolute top-12 left-0 z-30 w-panel bg-bg-secondary border-b border-border shadow-lg max-h-[60%] flex flex-col">
              <div className="flex border-b border-border">
                <button
                  onClick={() => setTestamentTab('old')}
                  className={cn(
                    'flex-1 py-2 text-xs font-medium transition-colors',
                    testamentTab === 'old' ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text-secondary',
                  )}
                >
                  Old Testament
                </button>
                <button
                  onClick={() => setTestamentTab('new')}
                  className={cn(
                    'flex-1 py-2 text-xs font-medium transition-colors',
                    testamentTab === 'new' ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text-secondary',
                  )}
                >
                  New Testament
                </button>
              </div>
              <div className="overflow-y-auto p-2 space-y-0.5">
                {filteredBooks.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => handleBookSelect(book)}
                    className={cn(
                      'w-full text-left px-3 py-1.5 rounded text-sm transition-colors flex items-center justify-between',
                      bookSlug === book.slug ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
                    )}
                  >
                    <span>{book.name}</span>
                    <span className="text-2xs text-text-muted">{book.chapters}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Verse list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-text-muted text-center py-8">Loading...</p>
            ) : verses.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">Select a book to begin</p>
            ) : (
              verses.map((v) => {
                const selected = selectedIds.has(v.id)
                return (
                  <button
                    key={v.id}
                    onClick={() => toggleVerse(v.id)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 flex gap-3 hover:bg-bg-tertiary transition-colors border-b border-border/30',
                      selected && 'bg-accent/5',
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors',
                        selected
                          ? 'bg-accent border-accent'
                          : 'border-border hover:border-text-muted',
                      )}
                    >
                      {selected && <Check className="w-3 h-3 text-bg-primary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-2xs text-accent font-medium mr-2 align-super">{v.verse}</span>
                      <span className={cn(
                        'text-sm leading-relaxed',
                        selected ? 'text-text-primary' : 'text-text-secondary',
                      )}>
                        {v.text}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Add to canvas button */}
          {selectedCount > 0 && (
            <div className="shrink-0 border-t border-border p-3">
              <button
                onClick={handleAddToCanvas}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-accent text-bg-primary text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Add {selectedCount} verse{selectedCount > 1 ? 's' : ''} to canvas
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile: bottom sheet */}
      {open && (
        <div className={cn(
          'absolute inset-0 z-20 md:hidden',
          'transition-opacity duration-200',
        )}>
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="absolute inset-x-0 bottom-0 top-12 bg-bg-secondary rounded-t-2xl shadow-2xl flex flex-col">
            <div className="w-8 h-1 bg-border mx-auto mt-2 rounded-full shrink-0" />
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Mobile header */}
              <div className="h-12 shrink-0 flex items-center gap-2 px-4 border-b border-border">
                <button
                  onClick={() => setBookSelectorOpen(!bookSelectorOpen)}
                  className="text-sm font-medium text-text-primary truncate"
                >
                  {bookName || 'Select'}
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => setChapter(chapter - 1)}
                  disabled={chapter <= 1}
                  className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-text-muted w-6 text-center">{chapter}</span>
                <button
                  onClick={() => setChapter(chapter + 1)}
                  disabled={chapter >= totalChapters}
                  className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile book tabs */}
              {bookSelectorOpen && (
                <div className="shrink-0 border-b border-border">
                  <div className="flex border-b border-border">
                    <button onClick={() => setTestamentTab('old')} className={cn('flex-1 py-2 text-xs font-medium', testamentTab === 'old' ? 'text-accent border-b-2 border-accent' : 'text-text-muted')}>OT</button>
                    <button onClick={() => setTestamentTab('new')} className={cn('flex-1 py-2 text-xs font-medium', testamentTab === 'new' ? 'text-accent border-b-2 border-accent' : 'text-text-muted')}>NT</button>
                  </div>
                  <div className="max-h-40 overflow-y-auto p-2 space-y-0.5">
                    {filteredBooks.map((book) => (
                      <button
                        key={book.id}
                        onClick={() => handleBookSelect(book)}
                        className={cn('w-full text-left px-3 py-1.5 rounded text-sm', bookSlug === book.slug ? 'bg-accent/10 text-accent' : 'text-text-secondary')}
                      >
                        {book.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile verse list */}
              <div className="flex-1 overflow-y-auto">
                {verses.map((v) => {
                  const selected = selectedIds.has(v.id)
                  return (
                    <button
                      key={v.id}
                      onClick={() => toggleVerse(v.id)}
                      className={cn('w-full text-left px-4 py-2.5 flex gap-3 border-b border-border/30', selected && 'bg-accent/5')}
                    >
                      <div className={cn('w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center', selected ? 'bg-accent border-accent' : 'border-border')}>
                        {selected && <Check className="w-3 h-3 text-bg-primary" />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-2xs text-accent font-medium mr-2 align-super">{v.verse}</span>
                        <span className="text-sm leading-relaxed text-text-secondary">{v.text}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Mobile add button */}
              {selectedCount > 0 && (
                <div className="shrink-0 border-t border-border p-3">
                  <button onClick={handleAddToCanvas} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-accent text-bg-primary text-sm font-medium">
                    <Plus className="w-4 h-4" />
                    Add {selectedCount} verse{selectedCount > 1 ? 's' : ''}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
