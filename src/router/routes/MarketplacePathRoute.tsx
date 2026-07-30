import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  BookmarkPlus, BookmarkCheck, ChevronRight, Compass, Globe, Lock, Users, PenLine,
} from 'lucide-react'
import { AppPageLayout } from '@/components/layout/AppPageLayout'
import { EmptyState } from '@/components/ui/EmptyState'
import { useMarketplaceStore } from '@/lib/store/useMarketplaceStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { StarRating } from '@/components/study/guided/marketplace/StarRating'
import { MarketplaceStudyModal } from '@/components/study/guided/marketplace/MarketplaceStudyModal'
import type { PathStudySummary } from '@/lib/study/guidedEditorApi'
import { hueOf } from '@/components/study/guided/marketplace/hue'
import { paths } from '@/router/paths'
import { cn } from '@/lib/cn'

const VISIBILITY_ICON = { public: Globe, friends: Users, private: Lock } as const

/**
 * A path's own page: what it is, who wrote it, what is inside, and the two
 * things a visitor can do — rate it and put it on their study list.
 *
 * The studies can be started from here; the picker opens with the clicked study
 * already selected so the path from discovery to session is one click shorter.
 */
export function MarketplacePathRoute() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()

  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const openAuthModal = useUIStore((s) => s.openAuthModal)

  const detail = useMarketplaceStore((s) => s.detail)
  const loading = useMarketplaceStore((s) => s.loading)
  const error = useMarketplaceStore((s) => s.error)
  const openPath = useMarketplaceStore((s) => s.openPath)
  const closePath = useMarketplaceStore((s) => s.closePath)
  const rate = useMarketplaceStore((s) => s.rate)
  const toggleList = useMarketplaceStore((s) => s.toggleList)
  const [selectedStudy, setSelectedStudy] = useState<{ planSlug: string; studySlug: string } | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal()
      navigate(paths.root(), { replace: true })
    }
  }, [authLoading, user, openAuthModal, navigate])

  useEffect(() => {
    if (!user || !slug) return
    void openPath(slug)
    // Leaving the page drops the path so the next one does not flash the old.
    return () => closePath()
  }, [user, slug, openPath, closePath])

  const showing = detail && detail.slug === slug ? detail : null
  const selectedStudyEntry: PathStudySummary | null = showing && selectedStudy
    ? showing.studies.find((entry) => entry.slug === selectedStudy.studySlug) ?? null
    : null
  const hue = hueOf(slug ?? '')
  const VisibilityIcon = showing ? VISIBILITY_ICON[showing.visibility] : Globe

  return (
    <AppPageLayout title={showing?.title ?? t('market.title')}>
      {!showing && loading && (
        <p className="py-16 text-center text-xs text-text-muted">{t('common.loading')}</p>
      )}

      {!showing && !loading && (
        <div className="py-16">
          <EmptyState message={error ?? t('market.notFound')} />
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => navigate(paths.marketplace())}
              className="text-xs font-medium text-accent hover:underline"
            >
              {t('market.backToMarket')}
            </button>
          </div>
        </div>
      )}

      {showing && (
        <>
          <div
            className="relative"
            style={{ background: `linear-gradient(135deg, hsl(${hue} 62% 32%), hsl(${(hue + 48) % 360} 58% 18%))` }}
          >
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

            <div className="workspace-page-frame relative mx-auto w-full max-w-5xl px-4 pb-7 pt-5 md:px-8 md:pb-9 md:pt-7">
              <nav
                aria-label={t('market.breadcrumbLabel')}
                className="mb-5 flex items-center gap-1.5 text-xs"
              >
                <button
                  type="button"
                  onClick={() => navigate(paths.marketplace())}
                  className="font-medium text-white/75 transition-colors hover:text-white"
                >
                  {t('market.title')}
                </button>
                <ChevronRight className="h-3.5 w-3.5 text-white/45" aria-hidden="true" />
                <span className="truncate text-white/90" aria-current="page">{showing.title}</span>
              </nav>

              <h1 className="workspace-detail-title text-2xl font-semibold leading-tight text-white md:text-4xl">{showing.title}</h1>

              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/75">
                <span>
                  {showing.is_mine
                    ? t('market.byMe')
                    : t('market.byAuthor', { name: showing.author?.name ?? t('common.unknown') })}
                </span>
                <span aria-hidden>·</span>
                <span>{t('path.studyCount', { count: showing.studies.length })}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <VisibilityIcon className="h-3 w-3" />
                  {t(`path.visibility.${showing.visibility}`)}
                </span>
                {showing.list_count > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{t('market.added', { count: showing.list_count })}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="workspace-page-frame mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
            <div className="workspace-detail-grid grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div>
                {showing.description && (
                  <p className="text-sm leading-relaxed text-text-secondary">{showing.description}</p>
                )}

                <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
                  {t('market.whatsInside')}
                </h2>

                <ol className="overflow-hidden rounded-xl border border-border-subtle">
                  {showing.studies.map((study, index) => (
                    <li
                      key={study.slug}
                      className="border-b border-border-subtle last:border-0"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedStudy({ planSlug: showing.slug, studySlug: study.slug })}
                        className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-bg-tertiary"
                        aria-label={`${t('study.start.start')}: ${study.title}`}
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-bg-tertiary text-2xs font-semibold text-text-muted">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-text-primary">{study.title}</span>
                          {study.theme && (
                            <span className="mt-0.5 block text-2xs leading-relaxed text-text-muted">{study.theme}</span>
                          )}
                          <span className="mt-0.5 block text-2xs text-text-muted">
                            {t('path.steps', { count: study.step_count })}
                          </span>
                        </span>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
                      </button>
                    </li>
                  ))}

                  {showing.studies.length === 0 && (
                    <li className="p-4 text-xs text-text-muted">{t('market.noStudiesYet')}</li>
                  )}
                </ol>
              </div>

              <aside className="workspace-detail-aside space-y-4 lg:sticky lg:top-6 lg:self-start">
                <div className="rounded-xl border border-border-subtle p-4">
                  <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    {t('market.rating')}
                  </p>
                  <StarRating
                    average={showing.rating_avg}
                    count={showing.rating_count}
                    mine={showing.my_rating}
                    onRate={showing.is_mine ? undefined : (stars) => void rate(showing.slug, stars)}
                    disabledReason={showing.is_mine ? t('market.cannotRateOwn') : undefined}
                  />
                  {!showing.is_mine && (
                    <p className="mt-2 text-2xs leading-relaxed text-text-muted">{t('market.rateHint')}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void toggleList(showing.slug)}
                  aria-pressed={showing.in_my_list}
                  className={cn(
                    'flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors',
                    showing.in_my_list
                      ? 'border border-accent bg-accent/10 text-accent hover:bg-accent/20'
                      : 'bg-accent text-white hover:opacity-90',
                  )}
                >
                  {showing.in_my_list ? <BookmarkCheck className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
                  {showing.in_my_list ? t('market.inMyList') : t('market.addToList')}
                </button>

                {showing.in_my_list && (
                  <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-text-muted">
                    <Compass className="mt-0.5 h-3 w-3 shrink-0" />
                    {t('market.inPickerHint')}
                  </p>
                )}

                {showing.is_mine && (
                  <button
                    type="button"
                    onClick={() => navigate(paths.pathEditor(showing.slug))}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-subtle px-4 py-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                  >
                    <PenLine className="h-3.5 w-3.5" />
                    {t('market.editMine')}
                  </button>
                )}
              </aside>
            </div>
          </div>

          {selectedStudyEntry && (
            <MarketplaceStudyModal
              open
              plan={showing}
              study={selectedStudyEntry}
              onClose={() => setSelectedStudy(null)}
            />
          )}
        </>
      )}
    </AppPageLayout>
  )
}
