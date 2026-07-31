import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BookmarkPlus, BookmarkCheck, Award, ArrowRight } from 'lucide-react'
import { useMarketplaceStore } from '@/lib/store/useMarketplaceStore'
import type { StudyPathCard } from '@/lib/study/marketplaceApi'
import { paths } from '@/router/paths'
import { cn } from '@/lib/cn'
import { StarRating } from './StarRating'
import { hueOf } from './hue'

/**
 * The front page's first impression: one path shown large, the next four beside
 * it, clicking any of them promotes it into the big slot.
 *
 * Paths have no cover art, so the "art" is generated from the slug — a stable
 * gradient plus the title set large. It reads as designed rather than as a
 * missing image.
 */
export function FeaturedHero({ items }: { items: StudyPathCard[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toggleList = useMarketplaceStore((s) => s.toggleList)
  const rate = useMarketplaceStore((s) => s.rate)

  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  // Follow the server's ranking unless the visitor has picked one.
  useEffect(() => {
    if (activeSlug && !items.some((p) => p.slug === activeSlug)) setActiveSlug(null)
  }, [items, activeSlug])

  const hero = items.find((p) => p.slug === activeSlug) ?? items[0]
  if (!hero) return null

  const rest = items.filter((p) => p.slug !== hero.slug).slice(0, 4)
  const hue = hueOf(hero.slug)

  return (
    <section
      aria-label={t('market.featuredTitle')}
      className="workspace-featured-hero grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
    >
      <article className="relative overflow-hidden rounded-2xl border border-border-subtle">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, hsl(${hue} 62% 32%), hsl(${(hue + 48) % 360} 58% 18%))`,
          }}
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="workspace-featured-content relative flex h-full min-h-[19rem] flex-col justify-end gap-3 p-6 md:p-8">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur">
            <Award className="h-3 w-3" />
            {t('market.featuredBadge')}
          </span>

          <button type="button" onClick={() => navigate(paths.marketplacePath(hero.slug))} className="text-left">
            <h2 className="workspace-featured-title text-2xl font-semibold leading-tight text-white decoration-white/40 hover:underline md:text-4xl">
              {hero.title}
            </h2>
          </button>

          <p className="text-xs text-white/70">
            {hero.is_mine
              ? t('market.byMe')
              : t('market.byAuthor', { name: hero.author?.name ?? t('common.unknown') })}
            {' · '}
            {t('path.studyCount', { count: hero.study_count })}
          </p>

          {hero.description && (
            <p className="line-clamp-3 max-w-xl text-sm leading-relaxed text-white/85">{hero.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg bg-black/30 px-2 py-1 backdrop-blur">
              <StarRating
                average={hero.rating_avg}
                count={hero.rating_count}
                mine={hero.my_rating}
                onRate={hero.is_mine ? undefined : (stars) => void rate(hero.slug, stars)}
                disabledReason={hero.is_mine ? t('market.cannotRateOwn') : undefined}
              />
            </div>

            <button
              type="button"
              onClick={() => void toggleList(hero.slug)}
              aria-pressed={hero.in_my_list}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                hero.in_my_list
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-white text-black hover:bg-white/90',
              )}
            >
              {hero.in_my_list ? <BookmarkCheck className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
              {hero.in_my_list ? t('market.inMyList') : t('market.addToList')}
            </button>

            <button
              type="button"
              onClick={() => navigate(paths.marketplacePath(hero.slug))}
              className="inline-flex items-center gap-1 text-xs font-medium text-white/80 transition-colors hover:text-white"
            >
              {t('market.seePath')}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </article>

      {rest.length > 0 && (
        <div className="workspace-featured-list flex flex-col gap-2">
          {rest.map((item) => {
            const h = hueOf(item.slug)
            return (
              <button
                key={item.slug}
                type="button"
                onClick={() => setActiveSlug(item.slug)}
                className="workspace-featured-item group flex flex-1 items-center gap-3 rounded-xl border border-border-subtle bg-bg-primary p-2.5 text-left transition-colors hover:border-accent/50 hover:bg-bg-tertiary"
              >
                <span
                  aria-hidden
                  className="h-11 w-11 shrink-0 rounded-lg"
                  style={{ background: `linear-gradient(135deg, hsl(${h} 62% 42%), hsl(${(h + 48) % 360} 58% 26%))` }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-text-primary transition-colors group-hover:text-accent">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block">
                    <StarRating average={item.rating_avg} count={item.rating_count} />
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
