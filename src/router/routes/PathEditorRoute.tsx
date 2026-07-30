import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Plus, Save, Trash2, ChevronUp, ChevronDown, Globe, Lock, Users, Store, FileText,
} from 'lucide-react'
import { AppPageLayout } from '@/components/layout/AppPageLayout'
import { useGuidedEditorStore } from '@/lib/store/useGuidedEditorStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { AddStepMenu } from '@/components/study/guided/editor/AddStepMenu'
import { StepFields } from '@/components/study/guided/editor/StepFields'
import { StudyFields } from '@/components/study/guided/editor/StudyFields'
import type { PathVisibility } from '@/lib/study/guidedEditorApi'
import { stepKind } from '@/lib/study/guidedStepKinds'
import { modKey, shiftKey } from '@/lib/platform'
import { paths } from '@/router/paths'
import { cn } from '@/lib/cn'

const VISIBILITY: { value: PathVisibility; Icon: typeof Globe }[] = [
  { value: 'private', Icon: Lock },
  { value: 'friends', Icon: Users },
  { value: 'public', Icon: Globe },
]

/**
 * The step editor, full width: studies on the left, their steps in the middle,
 * the selected step (or the study's own metadata) on the right.
 *
 * It was a side panel first, which meant one narrow column and no room for a
 * study's theme or memory verse at all. Three columns is what the work actually
 * wants — you are looking at a list you reorder while editing one item of it.
 *
 * Keyboard-first, like the rest of the app: j/k walk the steps, ⇧J/⇧K reorder,
 * ⌘↵ saves. Shortcuts stand down while a field has focus.
 */
export function PathEditorRoute() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { slug, studySlug } = useParams<{ slug: string; studySlug?: string }>()

  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const openAuthModal = useUIStore((s) => s.openAuthModal)

  const pathsMine = useGuidedEditorStore((s) => s.paths)
  const study = useGuidedEditorStore((s) => s.study)
  const steps = useGuidedEditorStore((s) => s.steps)
  const selected = useGuidedEditorStore((s) => s.selected)
  const dirty = useGuidedEditorStore((s) => s.dirty)
  const saving = useGuidedEditorStore((s) => s.saving)
  const error = useGuidedEditorStore((s) => s.error)
  const loadPaths = useGuidedEditorStore((s) => s.loadPaths)
  const openStudyBySlug = useGuidedEditorStore((s) => s.openStudyBySlug)
  const addStudy = useGuidedEditorStore((s) => s.addStudy)
  const deleteStudy = useGuidedEditorStore((s) => s.deleteStudy)
  const setVisibility = useGuidedEditorStore((s) => s.setVisibility)
  const requestPublication = useGuidedEditorStore((s) => s.requestPublication)
  const renamePath = useGuidedEditorStore((s) => s.renamePath)
  const addStep = useGuidedEditorStore((s) => s.addStep)
  const removeStep = useGuidedEditorStore((s) => s.removeStep)
  const moveStep = useGuidedEditorStore((s) => s.moveStep)
  const select = useGuidedEditorStore((s) => s.select)
  const saveSteps = useGuidedEditorStore((s) => s.saveSteps)

  const [tab, setTab] = useState<'step' | 'study'>('step')
  const [confirmDeleteStudy, setConfirmDeleteStudy] = useState(false)

  const current = useMemo(() => pathsMine.find((p) => p.slug === slug) ?? null, [pathsMine, slug])
  const moderationStatus = current?.moderation_status ?? 'not_required'

  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal()
      navigate(paths.root(), { replace: true })
    }
  }, [authLoading, user, openAuthModal, navigate])

  useEffect(() => {
    if (user) void loadPaths()
  }, [user, loadPaths])

  // Publication review is asynchronous: the API returns the queued state
  // first, and the worker updates it after the AI call. Keep the editor in
  // sync while a review is actually in flight instead of making the user
  // reload the page to see the result.
  useEffect(() => {
    if (!user || !pathsMine.some((path) =>
      path.visibility === 'public' && ['pending_review', 'ai_reviewing'].includes(path.moderation_status ?? ''),
    )) return

    const interval = window.setInterval(() => void loadPaths(), 5000)
    return () => window.clearInterval(interval)
  }, [user, pathsMine, loadPaths])

  // Open whichever study the URL names; fall back to the first one.
  useEffect(() => {
    if (!slug || !current) return
    const target = studySlug ?? current.studies[0]?.slug
    if (!target) return
    if (!studySlug) {
      navigate(paths.pathEditor(slug, target), { replace: true })
      return
    }
    void openStudyBySlug(slug, target)
  }, [slug, studySlug, current, openStudyBySlug, navigate])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        void saveSteps()
        return
      }

      if (typing || event.metaKey || event.ctrlKey || event.altKey) return

      const { selected: at, steps: list } = useGuidedEditorStore.getState()
      if (list.length === 0) return

      if (event.shiftKey && (event.key === 'J' || event.key === 'ArrowDown')) {
        event.preventDefault()
        moveStep(at, at + 1)
      } else if (event.shiftKey && (event.key === 'K' || event.key === 'ArrowUp')) {
        event.preventDefault()
        moveStep(at, at - 1)
      } else if (event.key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault()
        select(Math.min(at + 1, list.length - 1))
        setTab('step')
      } else if (event.key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault()
        select(Math.max(at - 1, 0))
        setTab('step')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [select, moveStep, saveSteps])

  const handleAddStudy = async () => {
    if (!slug) return
    const created = await addStudy(slug, { title: t('path.untitledStudy') })
    if (created) navigate(paths.pathEditor(slug, created.slug))
  }

  if (!current) {
    return (
      <AppPageLayout title={t('path.title')}>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-xs text-text-muted">{error ?? t('path.notFound')}</p>
          <button
            type="button"
            onClick={() => navigate(paths.myPaths())}
            className="mt-4 text-xs font-medium text-accent hover:underline"
          >
            {t('path.backToPaths')}
          </button>
        </div>
      </AppPageLayout>
    )
  }

  return (
    <AppPageLayout title={current.title}>
      <div className="workspace-path-editor flex h-full min-h-0 flex-col">
        <header className="workspace-path-editor-header shrink-0 border-b border-border-subtle px-4 py-3 md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(paths.myPaths())}
              aria-label={t('path.backToPaths')}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <input
              defaultValue={current.title}
              key={current.slug}
              onBlur={(e) => {
                const next = e.target.value.trim()
                if (next && next !== current.title) void renamePath(current.slug, next)
              }}
              aria-label={t('path.renamePath')}
              className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-base font-semibold text-text-primary outline-none transition-colors hover:border-border-subtle focus:border-accent"
            />

            <div className="flex gap-1" role="group" aria-label={t('path.visibility')}>
              {VISIBILITY.map(({ value, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => void setVisibility(current.slug, value)}
                  aria-pressed={current.visibility === value}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-2xs font-medium transition-colors',
                    current.visibility === value
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border-subtle text-text-muted hover:bg-bg-tertiary hover:text-text-primary',
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {t(`path.visibility.${value}`)}
                </button>
              ))}
            </div>

            {current.visibility !== 'private' && (
              <button
                type="button"
                onClick={() => navigate(paths.marketplacePath(current.slug))}
                className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-2xs font-medium text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
              >
                <Store className="h-3 w-3" />
                {t('path.seeInMarket')}
              </button>
            )}

            <span className="text-2xs text-text-muted">{dirty ? t('path.unsaved') : t('path.saved')}</span>

            <button
              type="button"
              onClick={() => void saveSteps()}
              disabled={!dirty || saving}
              title={t('path.saveHint', { modKey })}
              className="inline-flex items-center gap-1 rounded-md border border-accent bg-accent/10 px-2.5 py-1 text-2xs font-semibold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="h-3 w-3" />
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>

          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          {current.visibility === 'public' && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border-subtle bg-bg-tertiary/50 px-2.5 py-2 text-2xs">
              <span className="font-medium text-text-secondary">
                {t(`path.moderationStatus.${moderationStatus}`, { defaultValue: moderationStatus })}
              </span>
              {current.moderation_reason && <span className="text-text-muted">{current.moderation_reason}</span>}
              {!['pending_review', 'ai_reviewing', 'ai_approved', 'admin_approved'].includes(moderationStatus) && (
                <button
                  type="button"
                  onClick={() => void requestPublication(current.slug)}
                  className="font-semibold text-accent hover:underline"
                >
                  {t('path.requestPublication')}
                </button>
              )}
            </div>
          )}
        </header>

        <div className="workspace-path-editor-grid grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[14rem_minmax(0,1fr)_22rem]">
          {/* Studies in this path */}
          <aside className="workspace-path-editor-studies min-h-0 overflow-y-auto border-b border-border-subtle lg:border-b-0 lg:border-r">
            <p className="px-4 pb-1 pt-3 text-2xs font-semibold uppercase tracking-[0.12em] text-text-muted">
              {t('path.studies')}
            </p>

            {current.studies.map((entry) => (
              <button
                key={entry.slug}
                type="button"
                onClick={() => navigate(paths.pathEditor(current.slug, entry.slug))}
                className={cn(
                  'flex w-full items-center gap-2 px-4 py-2 text-left transition-colors',
                  entry.slug === studySlug ? 'bg-accent/10 text-accent' : 'hover:bg-bg-tertiary',
                )}
              >
                <FileText className="h-3 w-3 shrink-0 opacity-70" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs">{entry.title}</span>
                  <span className="block text-2xs text-text-muted">
                    {t('path.steps', { count: entry.step_count })}
                  </span>
                </span>
              </button>
            ))}

            {current.studies.length === 0 && (
              <p className="px-4 py-3 text-2xs leading-relaxed text-text-muted">{t('path.noStudies')}</p>
            )}

            <button
              type="button"
              onClick={() => void handleAddStudy()}
              className="flex w-full items-center gap-1.5 px-4 py-2 text-xs text-accent transition-colors hover:bg-bg-tertiary"
            >
              <Plus className="h-3 w-3" />
              {t('path.addStudy')}
            </button>
          </aside>

          {/* Steps of the open study */}
          <section className="workspace-path-editor-steps min-h-0 overflow-y-auto border-b border-border-subtle lg:border-b-0 lg:border-r">
            {!study ? (
              <p className="px-4 py-8 text-center text-xs text-text-muted">{t('path.pickStudy')}</p>
            ) : (
              <>
                <div className="flex items-center gap-2 px-4 pb-2 pt-3">
                  <p className="mr-auto text-2xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    {t('path.stepsColumn')}
                  </p>
                  <AddStepMenu
                    onPick={(kind) => {
                      addStep(kind)
                      setTab('step')
                    }}
                  />
                </div>

                {steps.length === 0 && (
                  <p className="px-4 py-6 text-xs leading-relaxed text-text-muted">{t('path.noSteps')}</p>
                )}

                <ol>
                  {steps.map((step, index) => (
                    <li key={index}>
                      <div
                        className={cn(
                          'flex items-start gap-2 border-b border-border-subtle px-4 py-2 transition-colors',
                          index === selected ? 'bg-accent/5' : 'hover:bg-bg-tertiary',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            select(index)
                            setTab('step')
                          }}
                          className="flex min-w-0 flex-1 items-start gap-2 text-left"
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-2xs font-semibold',
                              index === selected ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-muted',
                            )}
                          >
                            {index + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-[0.1em] text-accent/70">
                              {(() => {
                                const { Icon } = stepKind(step.kind)
                                return <Icon className="h-3 w-3" />
                              })()}
                              {t(`guided.kind.${step.kind}`)}
                            </span>
                            <span className="block truncate text-xs text-text-primary">
                              {step.title || t('path.stepTitlePlaceholder')}
                            </span>
                            {step.reference && (
                              <span className="block truncate text-2xs text-text-muted">{step.reference}</span>
                            )}
                          </span>
                        </button>

                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveStep(index, index - 1)}
                            aria-label={t('path.moveUp')}
                            className="flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(index, index + 1)}
                            aria-label={t('path.moveDown')}
                            className="flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            aria-label={t('path.removeStep')}
                            className="flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-bg-tertiary hover:text-red-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>

                <p className="px-4 py-2 text-2xs text-text-muted">{t('path.shortcuts', { modKey, shiftKey })}</p>
              </>
            )}
          </section>

          {/* The selected step, or the study's own metadata */}
          <aside className="workspace-path-editor-fields min-h-0 overflow-y-auto">
            {study && (
              <>
                <div className="flex items-center gap-1 border-b border-border-subtle px-4 py-2">
                  {(['step', 'study'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTab(value)}
                      aria-pressed={tab === value}
                      className={cn(
                        'rounded-md px-2 py-1 text-2xs font-medium transition-colors',
                        tab === value
                          ? 'bg-accent/10 text-accent'
                          : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary',
                      )}
                    >
                      {t(value === 'step' ? 'path.tabStep' : 'path.tabStudy')}
                    </button>
                  ))}

                  <div className="flex-1" />

                  {tab === 'study' && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteStudy(true)}
                      aria-label={t('path.deleteStudy')}
                      className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="p-4">
                  {confirmDeleteStudy && tab === 'study' && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-2">
                      <p className="flex-1 text-2xs text-text-secondary">{t('path.deleteStudyConfirm')}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteStudy(false)
                          void deleteStudy(current.slug, study.slug).then(() =>
                            navigate(paths.pathEditor(current.slug)),
                          )
                        }}
                        className="text-2xs font-medium text-red-400 hover:underline"
                      >
                        {t('path.deleteYes')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteStudy(false)}
                        className="text-2xs text-text-muted hover:text-text-primary"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  )}

                  {tab === 'study' ? (
                    <StudyFields study={study} />
                  ) : steps[selected] ? (
                    <>
                      <p className="mb-3 text-2xs text-text-muted">
                        {t('path.stepOfCount', { index: selected + 1, total: steps.length })}
                      </p>
                      <StepFields step={steps[selected]} index={selected} />
                    </>
                  ) : (
                    <p className="text-xs leading-relaxed text-text-muted">{t('path.pickStep')}</p>
                  )}
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </AppPageLayout>
  )
}
