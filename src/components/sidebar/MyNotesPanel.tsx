import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { api } from '@/lib/api'
import { PanelHeader } from '@/components/layout/PanelHeader'

interface UserNote {
  id: number
  body: string
  created_at: string
  verse: {
    id: number
    number: number
    text: string
    chapter: number
    book: string
    slug: string
  }
}

export function MyNotesPanel() {
  const { t } = useTranslation()
  const user = useAuthStore(s => s.user)
  const openVerse = useVerseStore(s => s.openVerse)
  const closePanel = useUIStore(s => s.closePanel)
  const [notes, setNotes] = useState<UserNote[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    api.get<UserNote[]>('/api/user/notes')
      .then(setNotes)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (!user) return (
    <div className="flex-1 flex items-center justify-center px-6">
      <p className="text-sm text-text-muted text-center">{t('notes.signInPrompt')}</p>
    </div>
  )

  const handleNoteClick = (note: UserNote) => {
    void openVerse(note.verse.slug, note.verse.chapter, note.verse.number)
    closePanel()
  }

  return (
    <div className="flex flex-col h-full bg-bg-secondary md:bg-transparent">
      <PanelHeader
        title={t('nav.myNotes')}
        onClose={closePanel}
        closeLabel={t('common.close')}
      />
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-sm md:text-xs text-text-muted text-center py-8">{t('common.loading')}</p>
        ) : notes.length === 0 ? (
          <p className="text-sm md:text-xs text-text-muted text-center py-8">{t('notes.empty')}</p>
        ) : (
          notes.map(n => (
            <button
              key={n.id}
              onClick={() => handleNoteClick(n)}
              className="w-full text-left px-4 py-3.5 md:py-3 border-b border-border-subtle hover:bg-bg-secondary transition-colors"
            >
              <p className="text-sm md:text-xs text-accent font-medium mb-1">
                {n.verse.book} {n.verse.chapter}:{n.verse.number}
              </p>
              <p className="text-[15px] md:text-sm text-text-primary line-clamp-2">{n.body}</p>
              <p className="text-xs md:text-2xs text-text-muted mt-1 line-clamp-1">{n.verse.text}</p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
