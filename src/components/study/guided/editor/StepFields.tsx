import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X, AlertTriangle, Check } from 'lucide-react'
import { useGuidedEditorStore } from '@/lib/store/useGuidedEditorStore'
import { guidedEditorApi } from '@/lib/study/guidedEditorApi'
import type { DraftStep } from '@/lib/study/guidedEditorApi'
import { stepKind } from '@/lib/study/guidedStepKinds'
import { cn } from '@/lib/cn'

const inputClass =
  'w-full rounded-lg border border-border bg-bg-primary px-2.5 py-1.5 text-xs text-text-primary outline-none transition-colors focus:border-accent'

const labelClass = 'mb-1 block text-2xs font-medium uppercase tracking-[0.1em] text-text-muted'

/**
 * Everything about the selected step, in the editor's right-hand column.
 *
 * A passage step also shows what its reference actually resolves to, asked of
 * the server as it is typed — a reference that matches no book saves fine but
 * will not open the passage, and finding that out while writing is far better
 * than the reader finding out.
 */
export function StepFields({ step, index }: { step: DraftStep; index: number }) {
  const { t } = useTranslation()
  const patchStep = useGuidedEditorStore((s) => s.patchStep)
  const addPrompt = useGuidedEditorStore((s) => s.addPrompt)
  const removePrompt = useGuidedEditorStore((s) => s.removePrompt)
  const patchPrompt = useGuidedEditorStore((s) => s.patchPrompt)

  const [preview, setPreview] = useState<{ label: string; ok: boolean } | null>(null)
  const reference = step.reference ?? ''
  const spec = stepKind(step.kind)

  useEffect(() => {
    if (!spec.takesReference || reference.trim() === '') {
      setPreview(null)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const result = await guidedEditorApi.resolveReference(reference)
        if (cancelled) return
        const label = result.ranges
          .map((r) => `${r.book} ${r.chapter}${r.start ? `:${r.start}${r.end && r.end !== r.start ? `-${r.end}` : ''}` : ''}`)
          .join(' · ')
        setPreview({ label: label || reference, ok: result.resolved })
      } catch {
        if (!cancelled) setPreview(null)
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [reference, spec.takesReference])

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-text-muted">
        <spec.Icon className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
        {t(`path.kindHint.${step.kind}`)}
      </p>

      <div>
        <label className={labelClass} htmlFor="step-title">
          {t('path.stepTitlePlaceholder')}
        </label>
        <input
          id="step-title"
          value={step.title ?? ''}
          onChange={(e) => patchStep(index, { title: e.target.value || null })}
          placeholder={t('path.stepTitlePlaceholder')}
          className={inputClass}
        />
      </div>

      {spec.takesReference && (
        <div>
          <label className={labelClass} htmlFor="step-reference">
            {t('path.referencePlaceholder')}
          </label>
          <input
            id="step-reference"
            value={reference}
            onChange={(e) => patchStep(index, { reference: e.target.value || null })}
            placeholder="Juan 6:37, 44"
            className={inputClass}
          />
          {preview && (
            <p
              className={cn(
                'mt-1 flex items-center gap-1 text-2xs',
                preview.ok ? 'text-text-muted' : 'text-amber-400',
              )}
            >
              {preview.ok ? <Check className="h-3 w-3 shrink-0" /> : <AlertTriangle className="h-3 w-3 shrink-0" />}
              {preview.ok ? preview.label : t('path.referenceUnresolved')}
            </p>
          )}
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="step-body">
          {t('path.bodyPlaceholder')}
        </label>
        <textarea
          id="step-body"
          value={step.body ?? ''}
          onChange={(e) => patchStep(index, { body: e.target.value || null })}
          rows={3}
          className={cn(inputClass, 'resize-y')}
        />
      </div>

      {spec.takesPrompts && (
        <div>
          <span className={labelClass}>{t('path.questionPlaceholder')}</span>

          <div className="space-y-2">
            {step.prompts.map((prompt, promptIndex) => (
              <div key={promptIndex} className="rounded-lg border border-border-subtle p-2">
                <div className="flex items-start gap-1.5">
                  <input
                    value={prompt.question}
                    onChange={(e) => patchPrompt(index, promptIndex, { question: e.target.value })}
                    placeholder={t('path.questionPlaceholder')}
                    aria-label={t('path.questionPlaceholder')}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removePrompt(index, promptIndex)}
                    aria-label={t('path.removePrompt')}
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-muted hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {/* The answer stays hidden from the reader until they have
                    written their own, so it is optional by design: some
                    questions are the person's alone. */}
                <textarea
                  value={prompt.answer ?? ''}
                  onChange={(e) => patchPrompt(index, promptIndex, { answer: e.target.value || null })}
                  placeholder={t('path.answerPlaceholder')}
                  aria-label={t('path.answerPlaceholder')}
                  rows={2}
                  className={cn(inputClass, 'mt-1.5 resize-y')}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addPrompt(index)}
            className="mt-2 flex items-center gap-1 text-2xs text-accent hover:underline"
          >
            <Plus className="h-3 w-3" />
            {t('path.addPrompt')}
          </button>
        </div>
      )}
    </div>
  )
}
