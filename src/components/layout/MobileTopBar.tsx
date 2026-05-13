import { useTranslation } from 'react-i18next'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { cn } from '@/lib/cn'

export function MobileTopBar() {
  const { t } = useTranslation()
  const books = useVerseStore((s) => s.books)
  const selectedBook = useVerseStore((s) => s.selectedBook)
  const selectedChapter = useVerseStore((s) => s.selectedChapter)
  const navigateChapter = useVerseStore((s) => s.navigateChapter)
  const openMobileBookPicker = useUIStore((s) => s.openMobileBookPicker)
  const collapsed = useUIStore((s) => s.mobileChromeCollapsed)

  const book = books.find((b) => b.slug === selectedBook)
  const bookName = book?.name ?? ''

  return (
    <header
      className={cn(
        'flex shrink-0 items-center gap-1 border-b border-border-subtle bg-bg-secondary px-2 overflow-hidden transition-[height] duration-300 ease-out',
        collapsed ? 'h-7' : 'h-14',
      )}
    >
      <button
        type="button"
        onClick={() => navigateChapter('prev')}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
        aria-label={t('layout.prevChapter')}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
          <path d="M10 3l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <button
        type="button"
        onClick={openMobileBookPicker}
        className="flex flex-1 min-w-0 h-11 items-center justify-center gap-2 rounded-md px-3 text-base font-semibold text-text-primary hover:bg-bg-tertiary transition-colors"
        aria-label={t('layout.changeChapter')}
      >
        <span className="truncate">
          {bookName} <span className="tabular-nums">{selectedChapter}</span>
        </span>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-3.5 w-3.5 text-text-muted shrink-0" aria-hidden="true">
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => navigateChapter('next')}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
        aria-label={t('layout.nextChapter')}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
          <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </header>
  )
}
