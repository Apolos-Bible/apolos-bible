import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Search, PenLine, Sparkles, Store, ArrowRight, Bookmark, Compass } from 'lucide-react'
import { AppPageLayout } from '@/components/layout/AppPageLayout'
import { useMarketplaceStore } from '@/lib/store/useMarketplaceStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { FeaturedHero } from '@/components/study/guided/marketplace/FeaturedHero'
import { PathTile } from '@/components/study/guided/marketplace/PathTile'
import { CreatePathModal } from '@/components/study/guided/marketplace/CreatePathModal'
import type { MarketplaceSort } from '@/lib/study/marketplaceApi'
import { paths } from '@/router/paths'
import { cn } from '@/lib/cn'

const SORTS: MarketplaceSort[] = ['recent', 'rating', 'added']

/**
 * The marketplace front page: featured paths above the fold, an invitation to
 * publish, then everything people wrote.
 *
 * A full page rather than a side panel on purpose — this is the one screen that
 * should feel like somewhere you arrive, not something that slides over the
 * reader.
 */
export function MarketplaceRoute() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const openAuthModal = useUIStore((s) => s.openAuthModal)

  const featured = useMarketplaceStore((s) => s.featured)
  const listing = useMarketplaceStore((s) => s.listing)
  const myList = useMarketplaceStore((s) => s.myList)
  const sort = useMarketplaceStore((s) => s.sort)
  const nextCursor = useMarketplaceStore((s) => s.nextCursor)
  const loading = useMarketplaceStore((s) => s.loading)
  const loadingMore = useMarketplaceStore((s) => s.loadingMore)
  const error = useMarketplaceStore((s) => s.error)
  const browse = useMarketplaceStore((s) => s.browse)
  const loadMore = useMarketplaceStore((s) => s.loadMore)
  const loadFeatured = useMarketplaceStore((s) => s.loadFeatured)
  const loadMyList = useMarketplaceStore((s) => s.loadMyList)

  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  // Auth guard, same shape as the profile route: wait for init() so a deep link
  // does not bounce someone whose session is still loading.
  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal()
      navigate(paths.root(), { replace: true })
    }
  }, [authLoading, user, openAuthModal, navigate])

  useEffect(() => {
    if (!user) return
    void loadFeatured()
    void browse()
    void loadMyList()
  }, [user, loadFeatured, browse, loadMyList])

  return (
    <AppPageLayout
      title={t('market.title')}
      mobileActions={
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate(paths.myPaths())}
            aria-label={t('nav.myPaths')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
          >
            <Compass className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            aria-label={t('market.publishCta')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-accent transition-colors hover:bg-bg-tertiary"
          >
            <PenLine className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-8 md:py-8">
        <header className="mb-6 hidden items-start justify-between gap-4 md:flex">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-text-primary">
              <Store className="h-5 w-5 text-accent" />
              {t('market.title')}
            </h1>
            <p className="mt-1 text-xs text-text-muted">{t('market.pageSubtitle')}</p>
          </div>

          <div className="flex items-center gap-2">
            {myList.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-2 text-2xs text-text-muted">
                <Bookmark className="h-3 w-3" />
                {t('market.myListCount', { count: myList.length })}
              </span>
            )}

            <button
              type="button"
              onClick={() => navigate(paths.myPaths())}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            >
              <Compass className="h-3.5 w-3.5" />
              {t('path.title')}
            </button>

            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
            >
              <PenLine className="h-3.5 w-3.5" />
              {t('market.publishCta')}
            </button>
          </div>
        </header>

        {error && <p className="mb-4 text-xs text-red-400">{error}</p>}

        {featured.length > 0 && (
          <>
            <FeaturedHero items={featured} />

            <section aria-labelledby="featured-shelf" className="mt-7">
              <h2
                id="featured-shelf"
                className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary"
              >
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                {t('market.featuredTitle')}
              </h2>
              {/* Horizontal shelf: the wide content scrolls inside itself, the
                  page never scrolls sideways. */}
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
                {featured.map((item) => (
                  <PathTile key={item.slug} item={item} compact />
                ))}
              </div>
            </section>
          </>
        )}

        {/* Call to action. Sits between the shelf and the open listing, where
            someone has just seen what a good path looks like. */}
        <section className="mt-7 overflow-hidden rounded-2xl border border-accent/30 bg-accent/5">
          <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <h2 className="text-base font-semibold text-text-primary">{t('market.ctaTitle')}</h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-text-secondary">{t('market.ctaBody')}</p>
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              <PenLine className="h-3.5 w-3.5" />
              {t('market.ctaButton')}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        <section aria-labelledby="all-paths" className="mt-8">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 id="all-paths" className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
              {t('market.fromPeople')}
            </h2>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void browse({ q: search.trim() })
                    }
                  }}
                  placeholder={t('market.searchPlaceholder')}
                  aria-label={t('market.searchPlaceholder')}
                  className="w-full rounded-lg border border-border bg-bg-primary py-1.5 pl-8 pr-2.5 text-xs text-text-primary outline-none transition-colors focus:border-accent sm:w-56"
                />
              </div>

              <div className="flex gap-1" role="group" aria-label={t('market.sortBy')}>
                {SORTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => void browse({ sort: value })}
                    aria-pressed={sort === value}
                    className={cn(
                      'rounded-md border px-2 py-1 text-2xs font-medium transition-colors',
                      sort === value
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border-subtle text-text-muted hover:bg-bg-tertiary hover:text-text-primary',
                    )}
                  >
                    {t(`market.sort.${value}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading && listing.length === 0 && (
            <p className="py-10 text-center text-xs text-text-muted">{t('common.loading')}</p>
          )}

          {!loading && listing.length === 0 && (
            <div className="rounded-xl border border-border-subtle py-12 text-center">
              <p className="mx-auto max-w-md px-6 text-xs leading-relaxed text-text-muted">{t('market.empty')}</p>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="mt-4 text-xs font-medium text-accent hover:underline"
              >
                {t('market.beFirst')}
              </button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listing.map((item) => (
              <PathTile key={item.slug} item={item} />
            ))}
          </div>

          {nextCursor && (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="rounded-lg border border-border-subtle px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-50"
              >
                {loadingMore ? t('common.loading') : t('market.loadMore')}
              </button>
            </div>
          )}
        </section>
      </div>

      <CreatePathModal open={creating} onClose={() => setCreating(false)} />
    </AppPageLayout>
  )
}
