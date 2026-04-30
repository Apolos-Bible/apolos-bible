
import { useVerseStore } from '@/lib/store/useVerseStore'
import type { Book } from '@/lib/store/useVerseStore'
import { cn } from '@/lib/cn'

interface BookGroupProps {
  label: string
  books: Book[]
  selectedBook: string
  selectedChapter: number
  onSelect: (id: string) => void
  onSelectChapter: (chapter: number) => void
}

function BookGroup({ label, books, selectedBook, selectedChapter, onSelect, onSelectChapter }: BookGroupProps) {
  return (
    <div>
      <p className="text-2xs uppercase tracking-wider text-text-muted px-4 py-1 select-none">
        {label}
      </p>
      {books.map((book) => {
        const isSelected = selectedBook === book.id
        const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1)

        return (
          <div key={book.id}>
            <button
              onClick={() => onSelect(book.id)}
              aria-expanded={isSelected}
              className={cn(
                'flex w-full items-center gap-2 px-4 py-1.5 text-left text-sm transition-colors duration-100',
                isSelected
                  ? 'text-accent bg-bg-tertiary font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
              )}
            >
              <span
                className={cn(
                  'text-2xs transition-transform duration-150',
                  isSelected && 'rotate-90',
                )}
                aria-hidden="true"
              >
                ▸
              </span>
              <span className="min-w-0 flex-1 truncate">{book.name}</span>
              {isSelected && (
                <span className="text-2xs font-normal text-text-muted">
                  {selectedChapter}/{book.chapters}
                </span>
              )}
            </button>

            {isSelected && (
              <div className="px-4 py-2 bg-bg-primary/50">
                <div className="grid grid-cols-6 gap-1">
                  {chapters.map((chapter) => {
                    const isCurrent = selectedChapter === chapter

                    return (
                      <button
                        key={chapter}
                        onClick={() => onSelectChapter(chapter)}
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
            )}
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
  const selectBook = useVerseStore((s) => s.selectBook)
  const selectChapter = useVerseStore((s) => s.selectChapter)

  const oldTestament = books.filter((b) => b.testament === 'old')
  const newTestament = books.filter((b) => b.testament === 'new')

  return (
    <div className="flex-1 overflow-y-auto py-1">
      <BookGroup
        label="Old Testament"
        books={oldTestament}
        selectedBook={selectedBook}
        selectedChapter={selectedChapter}
        onSelect={selectBook}
        onSelectChapter={selectChapter}
      />
      <div className="mt-2">
        <BookGroup
          label="New Testament"
          books={newTestament}
          selectedBook={selectedBook}
          selectedChapter={selectedChapter}
          onSelect={selectBook}
          onSelectChapter={selectChapter}
        />
      </div>
    </div>
  )
}
