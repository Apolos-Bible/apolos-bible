

import { useVerseStore } from '@/lib/store/useVerseStore'
import { cn } from '@/lib/cn'

export function ChapterGrid() {
  const books = useVerseStore((s) => s.books)
  const selectedBook = useVerseStore((s) => s.selectedBook)
  const selectedChapter = useVerseStore((s) => s.selectedChapter)
  const selectChapter = useVerseStore((s) => s.selectChapter)

  const book = books.find((b) => b.id === selectedBook)

  if (!book) return null

  const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1)

  return (
    <div className="px-3 py-2">
      <div className="max-h-[min(42vh,18rem)] overflow-y-auto overscroll-contain pr-1">
        <div className="grid grid-cols-6 sm:grid-cols-7 gap-0.5">
          {chapters.map((n) => {
            const isSelected = selectedChapter === n
            return (
              <button
                key={n}
                onClick={() => selectChapter(n)}
                className={cn(
                  'w-6 h-6 sm:w-7 sm:h-7 text-[11px] sm:text-xs rounded flex items-center justify-center transition-colors duration-100',
                  isSelected
                    ? 'bg-accent text-bg-primary font-medium'
                    : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary',
                )}
              >
                {n}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
