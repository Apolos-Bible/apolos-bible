import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBookmarkStore } from '@/lib/store/useBookmarkStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useUIStore } from '@/lib/store/useUIStore'

export function FavoritesPanel() {
  const { t } = useTranslation()
  const user = useAuthStore(s => s.user)
  const { bookmarks, loading, load } = useBookmarkStore()
  const openVerse = useVerseStore(s => s.openVerse)
  const closePanel = useUIStore(s => s.closePanel)

  useEffect(() => {
    if (user) load()
  }, [user])

  if (!user) return (
    <div className="flex-1 flex items-center justify-center px-6">
      <p className="text-sm text-text-muted text-center">{t('favorites.signInPrompt')}</p>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between shrink-0">
        <span className="text-sm font-medium text-text-primary">{t('nav.favorites')}</span>
        <button onClick={closePanel} className="text-text-muted hover:text-text-primary text-lg leading-none">×</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-text-muted text-center py-8">{t('common.loading')}</p>
        ) : bookmarks.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-8">{t('favorites.empty')}</p>
        ) : (
          bookmarks.filter(b => b.verse).map(b => (
            <button
              key={b.id}
              onClick={() => {
                void openVerse(b.verse.slug, b.verse.chapter, b.verse.number)
                closePanel()
              }}
              className="w-full text-left px-4 py-3 border-b border-border-subtle hover:bg-bg-secondary transition-colors"
            >
              <p className="text-xs text-accent font-medium mb-1">
                {b.verse.book} {b.verse.chapter}:{b.verse.number}
              </p>
              <p className="text-sm text-text-secondary line-clamp-2">{b.verse.text}</p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
