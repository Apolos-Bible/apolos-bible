import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { X, BookOpen, StickyNote } from 'lucide-react'
import { useStudyStore } from '@/lib/store/useStudyStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { bibleApi } from '@/lib/bibleApi'
import { paths } from '@/router/paths'

interface StartStudyModalProps {
  open: boolean
  onClose: () => void
}

type StudyType = 'verse' | 'chapter' | 'free'

export function StartStudyModal({ open, onClose }: StartStudyModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const start = useStudyStore(s => s.start)

  const books = useVerseStore(s => s.books)
  const versionId = useVerseStore(s => s.versionId)

  const [type, setType] = useState<StudyType>('verse')
  const [bookSlug, setBookSlug] = useState('')
  const [chapter, setChapter] = useState(1)
  const [verseStart, setVerseStart] = useState(1)
  const [verseEnd, setVerseEnd] = useState(1)
  const [verseCount, setVerseCount] = useState<number | null>(null)
  const [loadingVerses, setLoadingVerses] = useState(false)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentBook = useMemo(() => books.find(b => b.slug === bookSlug), [books, bookSlug])
  const totalChapters = currentBook?.chapters ?? 1

  // Pre-fill from current reading context once when the modal opens.
  useEffect(() => {
    if (!open) return
    const { selectedBook, selectedChapter, verses, selectedVerseIds: sel, books: bookList } = useVerseStore.getState()
    setBookSlug(selectedBook || bookList[0]?.slug || '')
    setChapter(selectedChapter || 1)

    const versesInChapter = verses
      .filter(v => sel.includes(v.id))
      .map(v => v.verse)
      .sort((a, b) => a - b)

    setType('verse')
    if (versesInChapter.length > 0) {
      setVerseStart(versesInChapter[0])
      setVerseEnd(versesInChapter[versesInChapter.length - 1])
    } else {
      setVerseStart(1)
      setVerseEnd(1)
    }

    setTitle('')
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Load the chapter's verse count whenever book/chapter changes for verse type.
  useEffect(() => {
    if (!open || !bookSlug || type !== 'verse') return
    let cancelled = false
    setLoadingVerses(true)
    bibleApi
      .chapter(versionId, bookSlug, chapter)
      .then(data => {
        if (cancelled) return
        const count = data.verses.length
        setVerseCount(count)
        setVerseStart(s => Math.min(Math.max(s, 1), count))
        setVerseEnd(e => Math.min(Math.max(e, 1), count))
      })
      .catch(() => {
        if (!cancelled) setVerseCount(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingVerses(false)
      })
    return () => { cancelled = true }
  }, [open, bookSlug, chapter, versionId, type])

  if (!open) return null

  const handleStart = async () => {
    setError('')
    if (!title.trim()) {
      setError(t('study.start.titleRequired'))
      return
    }

    let anchorRef: string | undefined
    if (type === 'chapter') {
      if (!bookSlug) { setError(t('study.start.anchorRequired')); return }
      anchorRef = `${bookSlug}-${chapter}`
    } else if (type === 'verse') {
      if (!bookSlug) { setError(t('study.start.anchorRequired')); return }
      const vs = Math.max(1, verseStart)
      const ve = Math.max(vs, verseEnd)
      anchorRef = ve > vs ? `${bookSlug}-${chapter}-${vs}:${ve}` : `${bookSlug}-${chapter}-${vs}`
    }

    setLoading(true)
    try {
      await start({
        type,
        anchor_ref: anchorRef,
        title: title.trim(),
      })
      const sessionId = useStudyStore.getState().activeSession?.id
      onClose()
      if (sessionId) navigate(paths.study({ sessionId }))
    } catch (e: any) {
      setError(e?.message || t('study.start.failed'))
    } finally {
      setLoading(false)
    }
  }

  const selectClass =
    'bg-bg-primary border border-border rounded-lg px-2.5 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-surface border border-border rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-md font-semibold text-text-primary">{t('study.start.title')}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-text-secondary mb-2">{t('study.start.type')}</label>
          <div className="flex gap-1.5">
            {[
              { value: 'verse' as const, label: t('study.start.typeVerse'), Icon: BookOpen },
              { value: 'chapter' as const, label: t('study.start.typeChapter'), Icon: BookOpen },
              { value: 'free' as const, label: t('study.start.typeFree'), Icon: StickyNote },
            ].map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setType(value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  type === value
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {(type === 'verse' || type === 'chapter') && (
          <div className="mb-4 space-y-2">
            <label className="block text-xs font-medium text-text-secondary">
              {type === 'verse' ? t('study.start.passage') : t('study.start.chapter')}
            </label>
            <div className="flex gap-2">
              <select
                value={bookSlug}
                onChange={(e) => setBookSlug(e.target.value)}
                className={`${selectClass} flex-1 min-w-0`}
              >
                {books.map(b => (
                  <option key={b.slug} value={b.slug}>{b.name}</option>
                ))}
              </select>
              <select
                value={chapter}
                onChange={(e) => setChapter(Number(e.target.value))}
                className={`${selectClass} w-20`}
              >
                {Array.from({ length: totalChapters }, (_, i) => i + 1).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {type === 'verse' && (
              <div className="flex items-center gap-2">
                <select
                  value={verseStart}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setVerseStart(v)
                    if (verseEnd < v) setVerseEnd(v)
                  }}
                  disabled={!verseCount || loadingVerses}
                  className={`${selectClass} flex-1`}
                >
                  {Array.from({ length: verseCount ?? 0 }, (_, i) => i + 1).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <span className="text-xs text-text-muted">{t('study.start.to')}</span>
                <select
                  value={verseEnd}
                  onChange={(e) => setVerseEnd(Number(e.target.value))}
                  disabled={!verseCount || loadingVerses}
                  className={`${selectClass} flex-1`}
                >
                  {Array.from({ length: verseCount ?? 0 }, (_, i) => i + 1)
                    .filter(v => v >= verseStart)
                    .map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="mb-5">
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            {t('study.start.titleLabel')} <span className="text-accent">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('study.start.titlePlaceholder')}
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 mb-4">{error}</p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            {t('study.start.cancel')}
          </button>
          <button
            onClick={handleStart}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-bg-primary hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? t('study.start.starting') : t('study.start.start')}
          </button>
        </div>
      </div>
    </div>
  )
}
