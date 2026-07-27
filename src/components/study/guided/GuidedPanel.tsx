import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as Y from 'yjs'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Compass,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react'
import { useGuidedStore, promptKey } from '@/lib/store/useGuidedStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { fetchGuidedVerses } from '@/lib/study/guidedPassage'
import { claimGuidedInsert, readGuidedStep, getGuidedMap, writeGuidedStep } from '@/lib/study/yDocHelpers'
import type { GuidedStep } from '@/lib/study/guidedApi'
import { cn } from '@/lib/cn'
import { GuidedPrompt } from './GuidedPrompt'

interface GuidedPanelProps {
  slug: string
  sessionId: string
  doc: Y.Doc | null
  open: boolean
  onClose: () => void
  isGuest: boolean
}

/** Each step's passage gets its own column on the canvas, left to right. */
const STEP_COLUMN_WIDTH = 440

/**
 * Docked width from `md` up — keep in sync with the `md:w-[420px]` class below.
 * Anything floating over the canvas (the chat bubble) shifts left by this much.
 */
export const GUIDED_PANEL_WIDTH = 420

export function GuidedPanel({ slug, sessionId, doc, open, onClose, isGuest }: GuidedPanelProps) {
  const { t } = useTranslation()
  const study = useGuidedStore((s) => s.study)
  const progress = useGuidedStore((s) => s.progress)
  const answers = useGuidedStore((s) => s.answers)
  const revealed = useGuidedStore((s) => s.revealed)
  const loading = useGuidedStore((s) => s.loading)
  const error = useGuidedStore((s) => s.error)
  const openStudy = useGuidedStore((s) => s.open)
  const goToStep = useGuidedStore((s) => s.goToStep)
  const setAnswer = useGuidedStore((s) => s.setAnswer)
  const flushAnswer = useGuidedStore((s) => s.flushAnswer)
  const reveal = useGuidedStore((s) => s.reveal)
  const complete = useGuidedStore((s) => s.complete)

  const versionId = useVerseStore((s) => s.versionId)
  const [notesOpen, setNotesOpen] = useState(false)
  const [inserting, setInserting] = useState(false)
  const [insertError, setInsertError] = useState(false)

  useEffect(() => {
    void openStudy(slug, sessionId)
  }, [openStudy, slug, sessionId])

  const stepIndex = Math.min(progress?.current_step ?? 0, Math.max(0, (study?.steps.length ?? 1) - 1))
  const step: GuidedStep | undefined = study?.steps[stepIndex]
  const isLast = !!study && stepIndex === study.steps.length - 1
  const completed = Boolean(progress?.completed_at)

  // --- Walking together: the current step lives in the shared doc ----------
  useEffect(() => {
    if (!doc) return
    const guided = getGuidedMap(doc)
    const follow = () => {
      const shared = readGuidedStep(doc)
      if (shared != null && shared !== useGuidedStore.getState().progress?.current_step) {
        goToStep(shared)
      }
    }
    guided.observe(follow)
    follow()
    return () => guided.unobserve(follow)
  }, [doc, goToStep])

  const navigate = useCallback(
    (index: number) => {
      goToStep(index)
      if (doc && !isGuest) writeGuidedStep(doc, index)
    },
    [goToStep, doc, isGuest],
  )

  // --- Bring the passage onto the canvas ----------------------------------
  const insertPassage = useCallback(
    async (target: GuidedStep, { auto }: { auto: boolean }) => {
      if (isGuest || !doc || target.ranges.length === 0) return
      const actions = (window as any).__studyCanvasActions
      if (!actions?.addVerseChain) return
      // Only one participant plants each step's verses.
      if (auto && !claimGuidedInsert(doc, target.id)) return

      setInserting(true)
      setInsertError(false)
      try {
        const verses = await fetchGuidedVerses(target.ranges, versionId)
        if (verses.length > 0) {
          actions.addVerseChain(verses, { x: target.position * STEP_COLUMN_WIDTH, y: 0 })
        }
      } catch {
        setInsertError(true)
      } finally {
        setInserting(false)
      }
    },
    [doc, isGuest, versionId],
  )

  // Entering a step with Scripture puts it on the canvas without being asked:
  // the person should always have the passage in front of them.
  const autoInsertedRef = useRef<Set<number>>(new Set())
  useEffect(() => {
    if (!open || !step || isGuest) return
    if (step.ranges.length === 0) return
    if (autoInsertedRef.current.has(step.id)) return
    autoInsertedRef.current.add(step.id)
    void insertPassage(step, { auto: true })
  }, [open, step, isGuest, insertPassage])

  // Questions about a passage come one at a time: the next appears once this
  // one is answered or its answer has been read. Purely personal questions
  // (the opening ones, the application) are all shown — nobody should be stuck
  // behind a question they don't want to write down.
  const visiblePrompts = useMemo(() => {
    if (!step) return 0
    if (!step.prompts.some((prompt) => prompt.answer)) return step.prompts.length

    const firstOpen = step.prompts.findIndex((_, i) => {
      const key = promptKey(step.id, i)
      return !(answers[key]?.trim() || revealed[key])
    })
    return firstOpen === -1 ? step.prompts.length : Math.min(step.prompts.length, firstOpen + 1)
  }, [step, answers, revealed])

  // A note on the canvas has to stand on its own once the guide is closed, so
  // it carries the question (and the passage it came from), not just the answer.
  const pinToCanvas = useCallback(
    ({ question, answer }: { question: string; answer: string }) => {
      if (isGuest) return
      const heading = step?.reference ? `${step.reference} — ${question}` : question
      const actions = (window as any).__studyCanvasActions
      actions?.addStickyNote?.(undefined, `${heading}\n\n${answer}`)
    },
    [isGuest, step?.reference],
  )

  if (!open) return null

  return (
    <aside
      className="absolute right-0 top-0 bottom-0 z-20 w-full md:w-[420px] bg-bg-secondary border-l border-border-subtle flex flex-col shadow-xl"
      aria-label={t('guided.panelLabel')}
    >
      {/* Header */}
      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border-subtle">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-2xs uppercase tracking-[0.12em] text-text-muted">
              <Compass className="w-3 h-3" />
              {study?.plan?.title ?? t('guided.title')}
            </p>
            <h2 className="mt-0.5 text-sm font-semibold text-text-primary truncate">
              {study?.title ?? t('guided.loading')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {study && (
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-1 flex-1 rounded-full bg-bg-tertiary overflow-hidden">
              <div
                className="h-full bg-accent transition-[width] duration-300"
                style={{ width: `${((stepIndex + 1) / study.steps.length) * 100}%` }}
              />
            </div>
            <span className="text-2xs tabular-nums text-text-muted">
              {t('guided.stepCount', { current: stepIndex + 1, total: study.steps.length })}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading && !study && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('guided.loading')}
          </div>
        )}

        {error && !study && <p className="text-sm text-red-400">{error}</p>}

        {study && step && (
          <>
            {stepIndex === 0 && (study.theme || study.heart_goal) && (
              <div className="mb-4 rounded-lg border border-border-subtle bg-bg-tertiary/40 px-3 py-2.5 space-y-1.5">
                {study.theme && (
                  <p className="text-xs text-text-secondary leading-relaxed">
                    <span className="text-text-muted">{t('guided.theme')}: </span>
                    {study.theme}
                  </p>
                )}
                {study.heart_goal && (
                  <p className="text-xs text-text-secondary leading-relaxed">
                    <span className="text-text-muted">{t('guided.heartGoal')}: </span>
                    {study.heart_goal}
                  </p>
                )}
              </div>
            )}

            <p className="text-2xs font-medium uppercase tracking-[0.12em] text-text-muted mb-2">
              {t(`guided.kind.${step.kind}`)}
            </p>

            {step.reference && (
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 px-2 py-1 text-xs font-medium text-accent">
                  <BookOpen className="w-3.5 h-3.5" />
                  {step.reference}
                </span>
                {!isGuest && step.ranges.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void insertPassage(step, { auto: false })}
                    disabled={inserting}
                    className="text-2xs text-text-secondary hover:text-text-primary underline decoration-dotted disabled:opacity-50"
                  >
                    {inserting ? t('guided.inserting') : t('guided.insertOnCanvas')}
                  </button>
                )}
              </div>
            )}

            {insertError && <p className="mb-2 text-2xs text-red-400">{t('guided.insertFailed')}</p>}

            {step.kind === 'memory' && step.body && (
              <blockquote className="mb-3 rounded-lg border-l-2 border-accent bg-bg-tertiary/40 px-3 py-2.5 text-sm italic text-text-secondary leading-relaxed">
                {step.body}
              </blockquote>
            )}

            {step.kind !== 'memory' && step.body && (
              <p className="mb-3 text-xs italic text-text-muted">{step.body}</p>
            )}

            {step.kind === 'intro' && (
              <p className="mb-3 text-xs text-text-muted leading-relaxed">{t('guided.introHint')}</p>
            )}
            {step.kind === 'memory' && (
              <p className="mb-3 text-xs text-text-muted leading-relaxed">{t('guided.memoryHint')}</p>
            )}

            <div className="space-y-4">
              {step.prompts.slice(0, visiblePrompts).map((prompt, index) => {
                const key = promptKey(step.id, index)
                return (
                  <GuidedPrompt
                    key={key}
                    index={index}
                    question={prompt.question}
                    answer={prompt.answer}
                    myAnswer={answers[key] ?? ''}
                    revealed={Boolean(revealed[key])}
                    onChange={(value) => setAnswer(step.id, index, value)}
                    onBlur={() => void flushAnswer(step.id, index)}
                    onReveal={() => void reveal(step.id, index)}
                    onPin={isGuest ? undefined : pinToCanvas}
                    autoFocus={index === visiblePrompts - 1 && index > 0}
                  />
                )
              })}
            </div>

            {isLast && study.leader_notes && (
              <div className="mt-5 border-t border-border-subtle pt-3">
                <button
                  type="button"
                  onClick={() => setNotesOpen((v) => !v)}
                  className="flex w-full items-center gap-1.5 text-2xs uppercase tracking-[0.12em] text-text-muted hover:text-text-secondary transition-colors"
                >
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', notesOpen && 'rotate-180')} />
                  {t('guided.leaderNotes')}
                </button>
                {notesOpen && (
                  <p className="mt-2 whitespace-pre-line text-xs text-text-secondary leading-relaxed">
                    {study.leader_notes}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {study && (
        <div className="shrink-0 border-t border-border-subtle px-4 py-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate(stepIndex - 1)}
            disabled={stepIndex === 0}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('guided.previous')}
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={() => void complete()}
              disabled={completed}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-opacity',
                completed
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-accent text-bg-primary hover:opacity-90',
              )}
            >
              {completed ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              {completed ? t('guided.completed') : t('guided.finish')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(stepIndex + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-bg-primary hover:opacity-90 transition-opacity"
            >
              {t('guided.next')}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </aside>
  )
}
