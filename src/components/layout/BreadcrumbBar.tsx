
import { useTranslation } from 'react-i18next'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { usePresenceStore } from '@/lib/store/usePresenceStore'
import { PresenceAvatars } from '@/components/realtime/PresenceAvatars'

export function BreadcrumbBar() {
  const { t }           = useTranslation()
  const books           = useVerseStore((s) => s.books)
  const selectedBook    = useVerseStore((s) => s.selectedBook)
  const selectedChapter = useVerseStore((s) => s.selectedChapter)
  const openCommandPalette = useUIStore((s) => s.openCommandPalette)
  const others          = usePresenceStore((s) => s.others)

  const book     = books.find((b) => b.id === selectedBook)
  const bookName = book?.name ?? selectedBook

  return (
    <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border-subtle bg-bg-secondary">
      <button
        onClick={openCommandPalette}
        className="text-xs text-text-muted hover:text-text-secondary transition-colors duration-150 cursor-pointer"
        title={t('layout.openCommandPalette')}
      >
        {bookName}
      </button>
      <span className="text-xs text-text-muted select-none">›</span>
      <span className="text-xs text-text-muted">{selectedChapter}</span>
      <div className="flex-1" />
      <PresenceAvatars users={others} />
    </div>
  )
}
