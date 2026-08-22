import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  BookMarked,
  BookmarkCheck,
  BookmarkPlus,
  Compass,
  HeartHandshake,
  Loader2,
  Palette,
  Play,
  Plus,
  X,
} from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { useStudyStore } from '@/lib/store/useStudyStore'
import { useMarketplaceStore } from '@/lib/store/useMarketplaceStore'
import { guidedApi } from '@/lib/study/guidedApi'
import type { GuidedStudyDetail } from '@/lib/study/guidedApi'
import type { PathStudySummary } from '@/lib/study/guidedEditorApi'
import type { StudyPathDetail } from '@/lib/study/marketplaceApi'
import { stepKind } from '@/lib/study/guidedStepKinds'
import { findActiveGuidedSession } from '@/lib/study/guidedSessions'
import { paths } from '@/router/paths'
import { cn } from '@/lib/cn'

interface MarketplaceStudyModalProps {
  open: boolean
  onClose: () => void
  plan: StudyPathDetail
  study: PathStudySummary
}

/** Full study preview from the marketplace, with actions for this path. */
export function MarketplaceStudyModal({ open, onClose, plan, study }: MarketplaceStudyModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const start = useStudyStore((s) => s.start)
  const myStudies = useStudyStore((s) => s.myStudies)
  const loadMyStudies = useStudyStore((s) => s.loadMyStudies)
  const toggleList = useMarketplaceStore((s) => s.toggleList)
  const inMyList = useMarketplaceStore((s) => s.detail?.slug === plan.slug ? s.detail.in_my_list : plan.in_my_list)

  const [detail, setDetail] = useState<GuidedStudyDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(false)
  const [updatingList, setUpdatingList] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setDetail(null)
    setError(null)
    setLoading(true)

    guidedApi
      .study(study.slug)
      .then((result) => {
        if (!cancelled) setDetail(result)
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message ?? t('market.studyLoadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, study.slug, t])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setCheckingExisting(true)
    void loadMyStudies()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCheckingExisting(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, loadMyStudies])

  const activeStudy = findActiveGuidedSession(myStudies, study.slug)

  const handleStart = async () => {
    setStarting(true)
    setError(null)
    try {
      await start({ type: 'free', guided_study_slug: study.slug })
      const sessionId = useStudyStore.getState().activeSession?.id
      onClose()
      if (sessionId) navigate(paths.study({ sessionId }))
    } catch (e: any) {
      setError(e?.message ?? t('study.start.failed'))
    } finally {
      setStarting(false)
    }
  }

  const handleToggleList = async () => {
    setUpdatingList(true)
    setError(null)
    try {
      await toggleList(plan.slug)
    } finally {
      setUpdatingList(false)
    }
  }

  const handleContinue = () => {
    if (!activeStudy) return
    onClose()
    navigate(paths.study({ sessionId: activeStudy.id }))
  }

  const studyData = detail?.study

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="marketplace-study-title"
      className="flex max-h-[min(88vh,760px)] w-[min(680px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border-subtle px-5 py-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-2xs uppercase tracking-[0.12em] text-text-muted">
            <Compass className="h-3 w-3" />
            {plan.title}
          </p>
          <h2 id="marketplace-study-title" className="mt-1 text-lg font-semibold text-text-primary">
            {studyData?.title ?? study.title}
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {t('path.steps', { count: studyData?.steps.length ?? study.step_count })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {loading && !studyData && (
          <div className="flex items-center gap-2 py-8 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('market.loadingStudy')}
          </div>
        )}

        {error && !studyData && <p className="py-4 text-sm text-red-400">{error}</p>}

        {studyData && (
          <div className="space-y-5">
            {(studyData.theme || studyData.heart_goal) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {studyData.theme && (
                  <div className="rounded-xl border border-border-subtle bg-bg-tertiary/40 p-3">
                    <p className="mb-1 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-text-muted">
                      <Palette className="h-3 w-3" />
                      {t('guided.theme')}
                    </p>
                    <p className="text-sm leading-relaxed text-text-secondary">{studyData.theme}</p>
                  </div>
                )}
                {studyData.heart_goal && (
                  <div className="rounded-xl border border-border-subtle bg-bg-tertiary/40 p-3">
                    <p className="mb-1 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-text-muted">
                      <HeartHandshake className="h-3 w-3" />
                      {t('guided.heartGoal')}
                    </p>
                    <p className="text-sm leading-relaxed text-text-secondary">{studyData.heart_goal}</p>
                  </div>
                )}
              </div>
            )}

            {studyData.memory_verse_ref && (
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-accent">
                  <BookMarked className="h-3 w-3" />
                  {t('path.memoryRef')}
                </p>
                <p className="text-sm font-medium text-text-primary">{studyData.memory_verse_ref}</p>
                {studyData.memory_verse_text && (
                  <p className="mt-1 text-xs italic leading-relaxed text-text-secondary">{studyData.memory_verse_text}</p>
                )}
              </div>
            )}

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
                {t('market.studyOutline')}
              </h3>
              <ol className="space-y-2">
                {studyData.steps.map((step, index) => {
                  const spec = stepKind(step.kind)
                  const Icon = spec.Icon
                  return (
                    <li key={step.id} className="rounded-xl border border-border-subtle p-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary text-text-muted">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-text-muted">
                              {index + 1}. {t(`guided.kind.${step.kind}`)}
                            </span>
                            {step.reference && (
                              <span className="text-2xs text-accent">{step.reference}</span>
                            )}
                          </div>
                          {step.title && <h4 className="mt-1 text-sm font-medium text-text-primary">{step.title}</h4>}
                          {step.body && (
                            <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-text-secondary">
                              {step.body}
                            </p>
                          )}
                          {step.prompts.length > 0 && (
                            <p className="mt-2 text-2xs text-text-muted">
                              {t('market.questionCount', { count: step.prompts.length })}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>

            {studyData.leader_notes && (
              <div className="rounded-xl border border-border-subtle bg-bg-tertiary/40 p-3">
                <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.1em] text-text-muted">
                  {t('path.leaderNotes')}
                </p>
                <p className="whitespace-pre-line text-xs leading-relaxed text-text-secondary">{studyData.leader_notes}</p>
              </div>
            )}
          </div>
        )}

        {error && studyData && <p className="mt-4 text-xs text-red-400">{error}</p>}
      </div>

      <div className="shrink-0 space-y-3 border-t border-border-subtle px-5 py-4">
        {activeStudy && (
          <p className="text-xs leading-relaxed text-text-secondary">
            {t('market.studyAlreadyStarted')}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => void handleToggleList()}
            disabled={updatingList}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50',
              inMyList
                ? 'border-accent bg-accent/10 text-accent hover:bg-accent/20'
                : 'border-border-subtle text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
            )}
          >
            {updatingList ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : inMyList ? <BookmarkCheck className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
            {inMyList ? t('market.inMyList') : t('market.addPathToList')}
          </button>

          <div className="flex flex-col gap-2 sm:flex-row">
            {activeStudy && (
              <button
                type="button"
                onClick={() => void handleStart()}
                disabled={starting || checkingExisting}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-50"
              >
                {starting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {starting ? t('study.start.starting') : t('market.startNewStudy')}
              </button>
            )}
            <button
              type="button"
              onClick={activeStudy ? handleContinue : () => void handleStart()}
              disabled={starting || checkingExisting}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {starting || checkingExisting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {checkingExisting
                ? t('market.checkingProgress')
                : activeStudy
                  ? t('market.continueStudy')
                  : starting
                    ? t('study.start.starting')
                    : t('market.startThisStudy')}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
