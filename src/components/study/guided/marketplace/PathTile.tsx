import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BookmarkPlus, BookmarkCheck, Users, Globe } from 'lucide-react'
import { useMarketplaceStore } from '@/lib/store/useMarketplaceStore'
import type { StudyPathCard } from '@/lib/study/marketplaceApi'
import { paths } from '@/router/paths'
import { cn } from '@/lib/cn'
import { StarRating } from './StarRating'
import { hueOf } from './hue'

interface Props {
  item: StudyPathCard
  /** Narrow tile for the horizontal shelf; the grid uses the wider default. */
  compact?: boolean
}

export function PathTile({ item, compact = false }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toggleList = useMarketplaceStore((s) => s.toggleList)
  const rate = useMarketplaceStore((s) => s.rate)
  const hue = hueOf(item.slug)

  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-primary transition-colors hover:border-accent/40',
        compact && 'w-56 shrink-0',
      )}
    >
      <button
        type="button"
        onClick={() => navigate(paths.marketplacePath(item.slug))}
        aria-label={item.title}
        className="relative h-24 w-full shrink-0"
        style={{ background: `linear-gradient(135deg, hsl(${hue} 62% 40%), hsl(${(hue + 48) % 360} 58% 24%))` }}
      >
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="absolute bottom-2 left-2.5 right-2.5 block truncate text-left text-sm font-semibold text-white">
          {item.title}
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="truncate text-2xs text-text-muted">
          {item.is_mine ? t('market.byMe') : t('market.byAuthor', { name: item.author?.name ?? t('common.unknown') })}
          {' · '}
          {t('path.studyCount', { count: item.study_count })}
        </p>

        {item.description && !compact && (
          <p className="line-clamp-2 text-2xs leading-relaxed text-text-secondary">{item.description}</p>
        )}

        <StarRating
          average={item.rating_avg}
          count={item.rating_count}
          mine={item.my_rating}
          onRate={item.is_mine ? undefined : (stars) => void rate(item.slug, stars)}
          disabledReason={item.is_mine ? t('market.cannotRateOwn') : undefined}
        />

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => void toggleList(item.slug)}
            aria-pressed={item.in_my_list}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-2xs font-medium transition-colors',
              item.in_my_list
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border-subtle text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
            )}
          >
            {item.in_my_list ? <BookmarkCheck className="h-3 w-3" /> : <BookmarkPlus className="h-3 w-3" />}
            {item.in_my_list ? t('market.inMyList') : t('market.addToList')}
          </button>

          <span className="flex items-center gap-1.5 text-2xs text-text-muted">
            {item.list_count > 0 && <span>{t('market.added', { count: item.list_count })}</span>}
            <span
              title={t(item.visibility === 'friends' ? 'path.visibility.friends' : 'path.visibility.public')}
              className="flex items-center"
            >
              {item.visibility === 'friends' ? <Users className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
            </span>
          </span>
        </div>
      </div>
    </article>
  )
}
