import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { commentaryApi, type Commentary } from '@/lib/commentaryApi'

export function CommentaryPanel() {
  const selectedBook    = useVerseStore((s) => s.selectedBook)
  const selectedChapter = useVerseStore((s) => s.selectedChapter)
  const books           = useVerseStore((s) => s.books)
  const toggleCommentary = useUIStore((s) => s.toggleCommentary)

  const [commentary, setCommentary] = useState<Commentary | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const { t } = useTranslation()
  const bookName = books.find((b) => b.slug === selectedBook)?.name ?? selectedBook

  useEffect(() => {
    if (!selectedBook || !selectedChapter) return
    setLoading(true)
    setError(false)
    setCommentary(null)
    commentaryApi.get(selectedBook, selectedChapter)
      .then(setCommentary)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [selectedBook, selectedChapter])

  // Attach native click handlers to every external link after HTML renders
  useEffect(() => {
    const el = contentRef.current
    if (!el || !commentary) return

    const handlers: Array<{ a: Element; fn: (e: Event) => void }> = []

    el.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href')!
      if (href.startsWith('#')) return
      const fn = (e: Event) => {
        e.preventDefault()
        openUrl(href).catch(() => {
          window.open(href, '_blank', 'noopener,noreferrer')
        })
      }
      a.addEventListener('click', fn)
      handlers.push({ a, fn })
    })

    return () => handlers.forEach(({ a, fn }) => a.removeEventListener('click', fn))
  }, [commentary])

  return (
    <div className="flex flex-col h-full bg-bg-secondary border-l border-border-subtle">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle flex-shrink-0">
        <div>
          <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.15em] text-accent/70">
            {t('commentary.title')}
          </p>
          <p className="text-[13px] font-medium text-text-primary mt-0.5">
            {bookName} {selectedChapter}
          </p>
        </div>
        <button
          onClick={toggleCommentary}
          className="text-text-muted hover:text-text-primary transition-colors p-1 rounded"
          aria-label={t('common.close')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading && (
          <div className="flex items-center justify-center h-32 text-text-muted text-sm">
            {t('commentary.loading')}
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-32 text-text-muted text-sm text-center px-4">
            {t('commentary.empty')}
          </div>
        )}

        {commentary && (
          <div
            ref={contentRef}
            className="commentary-content font-reading text-[14px] leading-[1.8] text-text-primary"
            dangerouslySetInnerHTML={{ __html: commentary.content }}
          />
        )}
      </div>
    </div>
  )
}
