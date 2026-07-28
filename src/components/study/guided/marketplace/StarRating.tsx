import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  /** Average across everyone, used when the viewer has not voted. */
  average: number
  count: number
  /** What the viewer voted, if they did. */
  mine?: number | null
  /** Omit to render read-only (a card the viewer may not rate — their own). */
  onRate?: (stars: number) => void
  disabledReason?: string
}

/**
 * Five stars. Filled against the viewer's own vote when there is one, otherwise
 * against the average — what you said about a path matters more to you than what
 * everyone else said.
 */
export function StarRating({ average, count, mine, onRate, disabledReason }: Props) {
  const { t } = useTranslation()
  const shown = mine ?? average
  const readOnly = !onRate

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex items-center"
        role={readOnly ? 'img' : 'group'}
        aria-label={readOnly ? t('market.ratingOf', { avg: average.toFixed(1) }) : t('market.rateIt')}
        title={disabledReason}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(shown)
          const label = t('market.starLabel', { count: star })

          return readOnly ? (
            <Star
              key={star}
              aria-hidden
              className={cn('w-3 h-3', filled ? 'fill-amber-400 text-amber-400' : 'text-border')}
            />
          ) : (
            <button
              key={star}
              type="button"
              onClick={() => onRate(star)}
              aria-label={label}
              aria-pressed={mine === star}
              className="p-0.5 rounded hover:bg-bg-tertiary transition-colors"
            >
              <Star
                className={cn(
                  'w-3.5 h-3.5 transition-colors',
                  filled
                    ? mine
                      ? 'fill-accent text-accent'
                      : 'fill-amber-400 text-amber-400'
                    : 'text-border',
                )}
              />
            </button>
          )
        })}
      </div>

      <span className="text-2xs text-text-muted">
        {count > 0 ? `${average.toFixed(1)} · ${t('market.votes', { count })}` : t('market.noVotes')}
      </span>
    </div>
  )
}
