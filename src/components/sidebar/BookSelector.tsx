
import { useEffect, useState } from 'react'
import { useVerseStore } from '@/lib/store/useVerseStore'
import type { Book } from '@/lib/store/useVerseStore'
import { cn } from '@/lib/cn'

interface BookGroupProps {
  label: string
  books: Book[]
  selectedBook: string
  openBook: string
  selectedChapter: number
  onOpenBook: (id: string) => void
  onSelectChapter: (bookId: string, chapter: number) => void
}

function BookGroup({ label, books, selectedBook, openBook, selectedChapter, onOpenBook, onSelectChapter }: BookGroupProps) {
  return (
    <div>
      <p className="text-2xs uppercase tracking-wider text-text-muted px-4 py-1 select-none">
        {label}
      </p>
      {books.map((book) => {
        const isActiveBook = selectedBook === book.id
        const isOpen = openBook === book.id
        const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1)

        return (
          <div key={book.id}>
            <button
              onClick={() => onOpenBook(book.id)}
              aria-expanded={isOpen}
              className={cn(
                'flex w-full items-center gap-2 px-4 py-1.5 text-left text-sm transition-colors duration-100',
                isActiveBook
                  ? 'text-accent bg-bg-tertiary font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
              )}
            >
              <span
                className={cn(
                  'text-2xs transition-transform duration-150',
                  isOpen && 'rotate-90',
                )}
                aria-hidden="true"
              >
                ▸
              </span>
              <span className="min-w-0 flex-1 truncate">{book.name}</span>
              {isActiveBook && (
                <span className="text-2xs font-normal text-text-muted">
                  {selectedChapter}/{book.chapters}
                </span>
              )}
            </button>

            <div
              className={cn(
                'grid overflow-hidden bg-bg-primary/50 transition-[grid-template-rows,opacity] duration-200 ease-out',
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
              aria-hidden={!isOpen}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="grid grid-cols-6 gap-1 px-4 py-2">
                  {chapters.map((chapter) => {
                    const isCurrent = isActiveBook && selectedChapter === chapter

                    return (
                      <button
                        key={chapter}
                        onClick={() => onSelectChapter(book.id, chapter)}
                        tabIndex={isOpen ? 0 : -1}
                        className={cn(
                          'h-7 rounded text-xs transition-colors duration-100',
                          isCurrent
                            ? 'bg-accent text-bg-primary font-medium'
                            : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary',
                        )}
                      >
                        {chapter}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function BookSelector() {
  const books = useVerseStore((s) => s.books)
  const selectedBook = useVerseStore((s) => s.selectedBook)
  const selectedChapter = useVerseStore((s) => s.selectedChapter)
  const loadChapter = useVerseStore((s) => s.loadChapter)
  const [openBook, setOpenBook] = useState(selectedBook)

  useEffect(() => {
    if (selectedBook) setOpenBook(selectedBook)
  }, [selectedBook])

  const oldTestament = books.filter((b) => b.testament === 'old')
  const newTestament = books.filter((b) => b.testament === 'new')

  return (
    <div className="flex-1 overflow-y-auto py-1">
      <BookGroup
        label="Old Testament"
        books={oldTestament}
        selectedBook={selectedBook}
        openBook={openBook}
        selectedChapter={selectedChapter}
        onOpenBook={setOpenBook}
        onSelectChapter={loadChapter}
      />
      <div className="mt-2">
        <BookGroup
          label="New Testament"
          books={newTestament}
          selectedBook={selectedBook}
          openBook={openBook}
          selectedChapter={selectedChapter}
          onOpenBook={setOpenBook}
          onSelectChapter={loadChapter}
        />
      </div>
    </div>
  )
}
