import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, Compass, Globe, Lock, Users, Trash2, Store, Pencil } from 'lucide-react'
import { AppPageLayout } from '@/components/layout/AppPageLayout'
import { useGuidedEditorStore } from '@/lib/store/useGuidedEditorStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { CreatePathModal } from '@/components/study/guided/marketplace/CreatePathModal'
import { hueOf } from '@/components/study/guided/marketplace/hue'
import { paths } from '@/router/paths'
import { cn } from '@/lib/cn'

const VISIBILITY_ICON = { public: Globe, friends: Users, private: Lock } as const

/** Everything this person wrote, and the way into each one's editor. */
export function MyPathsRoute() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const openAuthModal = useUIStore((s) => s.openAuthModal)

  const mine = useGuidedEditorStore((s) => s.paths)
  const loading = useGuidedEditorStore((s) => s.loading)
  const error = useGuidedEditorStore((s) => s.error)
  const loadPaths = useGuidedEditorStore((s) => s.loadPaths)
  const deletePath = useGuidedEditorStore((s) => s.deletePath)
  const requestPublication = useGuidedEditorStore((s) => s.requestPublication)

  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal()
      navigate(paths.root(), { replace: true })
    }
  }, [authLoading, user, openAuthModal, navigate])

  useEffect(() => {
    if (user) void loadPaths()
  }, [user, loadPaths])

  // Publication review is asynchronous: poll only while one of the user's
  // public paths is waiting for the worker or the AI, then stop automatically
  // as soon as it reaches a terminal state.
  useEffect(() => {
    if (!user || !mine.some((path) =>
      path.visibility === 'public' && ['pending_review', 'ai_reviewing'].includes(path.moderation_status ?? ''),
    )) return

    const interval = window.setInterval(() => void loadPaths(), 5000)
    return () => window.clearInterval(interval)
  }, [user, mine, loadPaths])

  return (
    <AppPageLayout
      title={t('path.title')}
      mobileActions={
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label={t('path.newPath')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-accent transition-colors hover:bg-bg-tertiary"
        >
          <Plus className="h-4 w-4" />
        </button>
      }
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-8 md:py-8">
        <nav
          aria-label={t('market.breadcrumbLabel')}
          className="mb-5 flex items-center gap-1.5 text-xs"
        >
          <button
            type="button"
            onClick={() => navigate(paths.marketplace())}
            className="font-medium text-text-muted transition-colors hover:text-text-primary"
          >
            {t('market.title')}
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
          <span className="text-text-secondary" aria-current="page">{t('path.title')}</span>
        </nav>

        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-text-primary">
              <Compass className="h-5 w-5 text-accent" />
              {t('path.title')}
            </h1>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-text-muted">{t('path.pageSubtitle')}</p>
          </div>

          <button
            type="button"
            onClick={() => setCreating(true)}
            className="hidden items-center gap-1.5 rounded-lg border border-accent bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 md:inline-flex"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('path.newPath')}
          </button>
        </header>

        {error && <p className="mb-4 text-xs text-red-400">{error}</p>}

        {loading && mine.length === 0 && (
          <p className="py-10 text-center text-xs text-text-muted">{t('common.loading')}</p>
        )}

        {!loading && mine.length === 0 && (
          <div className="rounded-xl border border-border-subtle py-12 text-center">
            <p className="mx-auto max-w-md px-6 text-xs leading-relaxed text-text-muted">{t('path.empty')}</p>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-4 text-xs font-medium text-accent hover:underline"
            >
              {t('path.newPath')}
            </button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((item) => {
            const hue = hueOf(item.slug)
            const VisibilityIcon = VISIBILITY_ICON[item.visibility]
            const moderationStatus = item.moderation_status ?? 'not_required'

            return (
              <article
                key={item.slug}
                className="flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-primary transition-colors hover:border-accent/40"
              >
                <button
                  type="button"
                  onClick={() => navigate(paths.pathEditor(item.slug))}
                  className="relative h-20 w-full shrink-0 text-left"
                  style={{ background: `linear-gradient(135deg, hsl(${hue} 62% 40%), hsl(${(hue + 48) % 360} 58% 24%))` }}
                >
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute bottom-2 left-3 right-3 block truncate text-sm font-semibold text-white">
                    {item.title}
                  </span>
                </button>

                <div className="flex flex-1 flex-col gap-2 p-3">
                  <p className="flex items-center gap-1.5 text-2xs text-text-muted">
                    <VisibilityIcon className="h-3 w-3" />
                    {t(`path.visibility.${item.visibility}`)}
                    {' · '}
                    {t('path.studyCount', { count: item.studies.length })}
                    {item.list_count > 0 && ` · ${t('path.addedBy', { count: item.list_count })}`}
                  </p>

                  {item.visibility === 'public' && (
                    <div className="rounded-md border border-border-subtle bg-bg-tertiary/50 px-2.5 py-2">
                      <p className="text-2xs font-medium text-text-secondary">
                        {t(`path.moderationStatus.${moderationStatus}`, { defaultValue: moderationStatus })}
                      </p>
                      {item.moderation_reason && (
                        <p className="mt-1 text-2xs leading-relaxed text-text-muted">{item.moderation_reason}</p>
                      )}
                      {!['pending_review', 'ai_reviewing', 'ai_approved', 'admin_approved'].includes(moderationStatus) && (
                        <button
                          type="button"
                          onClick={() => void requestPublication(item.slug)}
                          className="mt-2 text-2xs font-semibold text-accent hover:underline"
                        >
                          {t('path.requestPublication')}
                        </button>
                      )}
                    </div>
                  )}

                  {item.description && (
                    <p className="line-clamp-2 text-2xs leading-relaxed text-text-secondary">{item.description}</p>
                  )}

                  {confirmDelete === item.slug ? (
                    <div className="mt-auto flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-2">
                      <p className="flex-1 text-2xs text-text-secondary">{t('path.deleteConfirm')}</p>
                      <button
                        type="button"
                        onClick={() => {
                          void deletePath(item.slug)
                          setConfirmDelete(null)
                        }}
                        className="text-2xs font-medium text-red-400 hover:underline"
                      >
                        {t('path.deleteYes')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="text-2xs text-text-muted hover:text-text-primary"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-auto flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => navigate(paths.pathEditor(item.slug))}
                        className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-2xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                      >
                        <Pencil className="h-3 w-3" />
                        {t('path.editing')}
                      </button>

                      {item.visibility !== 'private' && (
                        <button
                          type="button"
                          onClick={() => navigate(paths.marketplacePath(item.slug))}
                          aria-label={t('path.seeInMarket')}
                          title={t('path.seeInMarket')}
                          className={cn(
                            'inline-flex h-6 w-6 items-center justify-center rounded-md text-text-muted',
                            'transition-colors hover:bg-bg-tertiary hover:text-text-primary',
                          )}
                        >
                          <Store className="h-3 w-3" />
                        </button>
                      )}

                      <div className="flex-1" />

                      <button
                        type="button"
                        onClick={() => setConfirmDelete(item.slug)}
                        aria-label={t('path.delete')}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-tertiary hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>

      <CreatePathModal open={creating} onClose={() => setCreating(false)} />
    </AppPageLayout>
  )
}
