import { useTranslation } from 'react-i18next'
import { BookOpen, AlertTriangle } from 'lucide-react'
import { useGuidedEditorStore } from '@/lib/store/useGuidedEditorStore'
import type { GuidedStudy } from '@/lib/study/guidedApi'
import { cn } from '@/lib/cn'

const inputClass =
  'w-full rounded-lg border border-border bg-bg-primary px-2.5 py-1.5 text-xs text-text-primary outline-none transition-colors focus:border-accent'

const labelClass = 'mb-1 block text-2xs font-medium uppercase tracking-[0.1em] text-text-muted'

/**
 * The study's own metadata — theme, heart goal, memory verse, leader notes.
 *
 * These were unreachable while the editor was a narrow side panel; the wide
 * layout has room for them, and a study without a theme is a study nobody knows
 * why they are doing. Saved on blur rather than per keystroke.
 *
 * The memory verse asks only for the reference: the words are looked up from it
 * on save, since we have the whole Bible in the database and asking someone to
 * copy a verse out by hand is asking them to keep two things in step for us.
 */
export function StudyFields({ study }: { study: GuidedStudy }) {
  const { t } = useTranslation()
  const updateStudyMeta = useGuidedEditorStore((s) => s.updateStudyMeta)

  const field = (
    key: 'title' | 'theme' | 'heart_goal' | 'memory_verse_ref' | 'leader_notes',
    label: string,
    rows = 0,
  ) => {
    const value = (study[key] as string | null) ?? ''
    const commit = (next: string) => {
      const trimmed = next.trim()
      if (trimmed === (value ?? '').trim()) return
      // Title is the one field that cannot be emptied — it names the study.
      if (key === 'title' && trimmed === '') return
      void updateStudyMeta({ [key]: key === 'title' ? trimmed : trimmed || null })
    }

    return (
      <div key={key}>
        <label className={labelClass} htmlFor={`study-${key}`}>
          {label}
        </label>
        {rows > 0 ? (
          <textarea
            id={`study-${key}`}
            defaultValue={value}
            onBlur={(e) => commit(e.target.value)}
            rows={rows}
            className={cn(inputClass, 'resize-y')}
          />
        ) : (
          <input
            id={`study-${key}`}
            defaultValue={value}
            onBlur={(e) => commit(e.target.value)}
            className={inputClass}
          />
        )}
      </div>
    )
  }

  const hasRef = Boolean(study.memory_verse_ref?.trim())

  return (
    // Keyed by slug so switching studies remounts the uncontrolled inputs with
    // the new values instead of keeping the previous study's text on screen.
    <div key={study.slug} className="space-y-4">
      {field('title', t('path.studyTitle'))}
      {field('theme', t('path.theme'), 2)}
      {field('heart_goal', t('path.heartGoal'), 2)}

      <div>
        {field('memory_verse_ref', t('path.memoryRef'))}

        {hasRef && study.memory_verse_text && (
          <blockquote className="mt-1.5 rounded-lg border-l-2 border-accent bg-bg-tertiary/40 px-2.5 py-2 text-2xs italic leading-relaxed text-text-secondary">
            {study.memory_verse_text}
          </blockquote>
        )}

        {hasRef && !study.memory_verse_text && (
          <p className="mt-1.5 flex items-start gap-1 text-2xs leading-relaxed text-amber-400">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            {t('path.memoryUnresolved')}
          </p>
        )}

        {!hasRef && (
          <p className="mt-1.5 flex items-start gap-1 text-2xs leading-relaxed text-text-muted">
            <BookOpen className="mt-0.5 h-3 w-3 shrink-0" />
            {t('path.memoryHint')}
          </p>
        )}
      </div>

      {field('leader_notes', t('path.leaderNotes'), 4)}
    </div>
  )
}
