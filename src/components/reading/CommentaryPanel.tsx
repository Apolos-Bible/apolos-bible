import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { commentaryApi, type Commentary } from '@/lib/commentaryApi'
import { PanelHeader } from '@/components/layout/PanelHeader'

export function CommentaryPanel() {
  const selectedBook    = useVerseStore((s) => s.selectedBook)
  const selectedChapter = useVerseStore((s) => s.selectedChapter)
  const books           = useVerseStore((s) => s.books)
  const toggleCommentary = useUIStore((s) => s.toggleCommentary)

  const [commentary, setCommentary] = useState<Commentary | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const { t, i18n } = useTranslation()
  const bookName = books.find((b) => b.slug === selectedBook)?.name ?? selectedBook

  useEffect(() => {
    if (!selectedBook || !selectedChapter) return
    setLoading(true)
    setError(false)
    setCommentary(null)
    commentaryApi.get(selectedBook, selectedChapter, i18n.language)
      .then(setCommentary)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [selectedBook, selectedChapter, i18n.language])

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
      <PanelHeader
        subtitle={t('commentary.title')}
        title={`${bookName} ${selectedChapter}`}
        onClose={toggleCommentary}
        closeLabel={t('common.close')}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 md:py-4">
        {loading && (
          <div className="flex items-center justify-center h-32 text-text-muted text-[15px] md:text-sm">
            {t('commentary.loading')}
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-32 text-text-muted text-[15px] md:text-sm text-center px-4">
            {t('commentary.empty')}
          </div>
        )}

        {commentary && (
          <div
            ref={contentRef}
            className="commentary-content font-reading text-[16px] md:text-[14px] leading-[1.8] text-text-primary"
            dangerouslySetInnerHTML={{ __html: commentary.content }}
          />
        )}
      </div>
    </div>
  )
}
