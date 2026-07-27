import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, StickyNote } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * How long we hold the answer back when the person hasn't written anything.
 * Not a punishment — a nudge to sit with the passage first. Writing even a few
 * words unlocks it immediately.
 */
const REFLECTION_MS = 12_000

interface GuidedPromptProps {
  index: number
  question: string
  /** What the passage teaches. Null when the question is the person's alone. */
  answer: string | null
  myAnswer: string
  revealed: boolean
  onChange: (value: string) => void
  onBlur: () => void
  onReveal: () => void
  onPin?: (payload: { question: string; answer: string }) => void
  autoFocus?: boolean
}

export function GuidedPrompt({
  index,
  question,
  answer,
  myAnswer,
  revealed,
  onChange,
  onBlur,
  onReveal,
  onPin,
  autoFocus,
}: GuidedPromptProps) {
  const { t } = useTranslation()
  const [secondsLeft, setSecondsLeft] = useState(answer && !revealed ? REFLECTION_MS / 1000 : 0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!answer || revealed) return
    setSecondsLeft(REFLECTION_MS / 1000)
    const started = Date.now()
    const timer = setInterval(() => {
      const left = Math.ceil((REFLECTION_MS - (Date.now() - started)) / 1000)
      setSecondsLeft(Math.max(0, left))
      if (left <= 0) clearInterval(timer)
    }, 500)
    return () => clearInterval(timer)
    // Restart the pause whenever this prompt becomes a different question.
  }, [question, answer, revealed])

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  const written = myAnswer.trim().length > 0
  const canReveal = written || secondsLeft <= 0

  return (
    <div className="border-t border-border-subtle pt-4 first:border-t-0 first:pt-0">
      <p className="text-sm text-text-primary leading-relaxed">
        <span className="text-text-muted mr-1.5 tabular-nums">{index + 1}.</span>
        {question}
      </p>

      <textarea
        ref={textareaRef}
        value={myAnswer}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={3}
        placeholder={t('guided.answerPlaceholder')}
        className="mt-2 w-full resize-y bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
      />

      <div className="mt-1.5 flex items-center gap-2">
        {answer && !revealed && (
          <button
            type="button"
            onClick={onReveal}
            disabled={!canReveal}
            title={canReveal ? undefined : t('guided.revealWait', { count: secondsLeft })}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-2xs font-medium transition-colors',
              canReveal
                ? 'text-accent hover:bg-accent/10'
                : 'text-text-muted cursor-not-allowed',
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            {canReveal ? t('guided.reveal') : t('guided.revealWait', { count: secondsLeft })}
          </button>
        )}
        {onPin && written && (
          <button
            type="button"
            onClick={() => onPin({ question, answer: myAnswer })}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-2xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <StickyNote className="w-3.5 h-3.5" />
            {t('guided.pinToCanvas')}
          </button>
        )}
      </div>

      {answer && revealed && (
        <div className="mt-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
          <p className="text-2xs font-medium uppercase tracking-[0.1em] text-accent mb-1">
            {t('guided.whatThePassageTeaches')}
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}
