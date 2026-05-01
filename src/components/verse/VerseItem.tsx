

import { useTranslation } from 'react-i18next'
import { useVerseStore } from '@/lib/store/useVerseStore'
import type { Verse } from '@/lib/store/useVerseStore'
import { useBookmarkStore } from '@/lib/store/useBookmarkStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useHighlightStore } from '@/lib/store/useHighlightStore'
import { VerseText } from '@/components/verse/VerseText'
import { cn } from '@/lib/cn'
import { useIsMobile } from '@/lib/useIsMobile'

interface VerseItemProps {
  verse: Verse
  isSelected: boolean
  noteCount: number
  highlightCount: number
}

export function VerseItem({ verse, isSelected, noteCount, highlightCount }: VerseItemProps) {
  const { t }       = useTranslation()
  const selectVerse = useVerseStore((s) => s.selectVerse)
  const user        = useAuthStore((s) => s.user)
  const fontSize    = useUIStore((s) => s.fontSize)
  const toggleBookmark = useBookmarkStore((s) => s.toggle)
  const isBookmarked = useBookmarkStore((s) => s.isBookmarked(verse.apiId))
  const verseHighlights = useHighlightStore((s) => s.highlights[verse.apiId]) ?? []
  const isMobile = useIsMobile()

  return (
    <div
      onClick={() => selectVerse(verse.id)}
      className={cn(
        'px-6 py-3 border-b border-border-subtle cursor-pointer group transition-colors duration-100',
        isSelected
          ? 'bg-bg-tertiary border-l-2 border-l-accent'
          : isBookmarked
            ? 'bg-fav/[0.04] border-l-2 border-l-fav/50 hover:bg-fav/[0.07]'
            : 'hover:bg-bg-secondary',
      )}
    >
      {/* Top row: reference + badge + quick actions */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-accent font-medium">
          {verse.chapter}:{verse.verse}
        </span>

        <div className="flex items-center gap-2">
          {/* Count badges */}
          {(noteCount > 0 || highlightCount > 0) && (
            <div className="flex items-center gap-1.5">
              {noteCount > 0 && (
                <span className="text-2xs text-text-muted flex items-center gap-0.5">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 2h8v7H7l-1 1.5L5 9H2V2z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                  {noteCount}
                </span>
              )}
              {highlightCount > 0 && (
                <span className="text-2xs text-text-muted flex items-center gap-0.5">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 9l1.5-1.5L8 4 9.5 5.5 6 9H3zM8 4L9.5 2.5l1 1L9 5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                  {highlightCount}
                </span>
              )}
            </div>
          )}

          {/* Quick-action highlight button — visible on hover */}
          {!isMobile && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                selectVerse(verse.id)
              }}
            title={isMobile ? t('verse.highlightVerse') : t('verse.highlightVerseTip')}
              aria-label={t('verse.highlightVerse')}
              className={cn(
                'opacity-0 group-hover:opacity-100 transition-opacity duration-100',
                'text-2xs text-text-muted hover:text-accent px-1 py-0.5 rounded',
                'border border-transparent hover:border-border-subtle',
                'flex items-center gap-0.5',
              )}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 9l1.5-1.5L8 4 9.5 5.5 6 9H3zM8 4L9.5 2.5l1 1L9 5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              <span>H</span>
            </button>
          )}

          {/* Bookmark button — visible on hover, only when logged in */}
          {user && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleBookmark(verse.apiId)
              }}
              title={isBookmarked ? t('verse.removeBookmark') : t('verse.bookmark')}
              aria-label={isBookmarked ? t('verse.removeBookmark') : t('verse.bookmark')}
              className={cn(
                'transition-all duration-150',
                isBookmarked
                  ? 'opacity-100 text-fav scale-110'
                  : 'opacity-0 group-hover:opacity-100 text-text-muted hover:text-fav',
                'px-1 py-0.5 rounded',
                'border border-transparent hover:border-border-subtle',
                'flex items-center',
              )}
            >
              <svg
                width={isBookmarked ? 13 : 10}
                height={isBookmarked ? 13 : 10}
                viewBox="0 0 16 16"
                fill={isBookmarked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M8 1.5l1.545 3.13 3.455.502-2.5 2.437.59 3.44L8 9.385l-3.09 1.624.59-3.44L3 5.132l3.455-.502L8 1.5z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Verse text preview */}
      <VerseText
        text={verse.text}
        highlights={verseHighlights}
        className={cn(
          fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base',
          'leading-snug overflow-hidden line-clamp-2 transition-colors duration-100',
          'text-text-secondary group-hover:text-text-primary',
        )}
      />
    </div>
  )
}
