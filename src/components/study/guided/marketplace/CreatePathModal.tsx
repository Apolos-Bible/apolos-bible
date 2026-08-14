import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { X, Globe, Lock, Users } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { useGuidedEditorStore } from '@/lib/store/useGuidedEditorStore'
import type { PathVisibility } from '@/lib/study/guidedEditorApi'
import { paths } from '@/router/paths'
import { cn } from '@/lib/cn'
import { DEFAULT_PATH_COVER_COLOR } from './PathCover'
import { PathCoverPicker, type PathCoverMode } from './PathCoverPicker'

const VISIBILITY = [
  { value: 'public' as const, Icon: Globe },
  { value: 'friends' as const, Icon: Users },
  { value: 'private' as const, Icon: Lock },
]

/**
 * Name the path, say who may see it, and land in the editor with its first
 * study open. Anything more than this belongs in the editor, not in a modal.
 */
export function CreatePathModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createPath = useGuidedEditorStore((s) => s.createPath)
  const setVisibility = useGuidedEditorStore((s) => s.setVisibility)
  const addStudy = useGuidedEditorStore((s) => s.addStudy)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  // Public by default here: someone arriving from the marketplace CTA means to
  // publish. Creating from the editor's own flow still defaults to private.
  const [visibility, setVisibility_] = useState<PathVisibility>('public')
  const [coverMode, setCoverMode] = useState<PathCoverMode>('color')
  const [coverColor, setCoverColor] = useState(DEFAULT_PATH_COVER_COLOR)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    const name = title.trim()
    if (!name || busy || (coverMode === 'image' && !coverFile)) return
    setBusy(true)
    setError(null)

    const created = await createPath(
      name,
      description.trim() || undefined,
      coverColor,
      coverMode === 'image' ? coverFile ?? undefined : undefined,
    )
    if (!created) {
      setError(useGuidedEditorStore.getState().error ?? t('market.createFailed'))
      setBusy(false)
      return
    }

    if (visibility !== 'private') await setVisibility(created.slug, visibility)

    // Give it its first study so the editor opens on something to write in
    // rather than an empty shell.
    const study = await addStudy(created.slug, { title: t('path.untitledStudy') })

    setBusy(false)
    setTitle('')
    setDescription('')
    setCoverMode('color')
    setCoverColor(DEFAULT_PATH_COVER_COLOR)
    setCoverFile(null)
    onClose()
    navigate(paths.pathEditor(created.slug, study?.slug))
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="create-path-title"
      initialFocus="#create-path-name"
      overlayClassName="bg-black/50"
      className="relative mx-4 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 id="create-path-title" className="text-md font-semibold text-text-primary">
          {t('market.createTitle')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-text-secondary">{t('market.createHint')}</p>

      <label className="mb-1.5 block text-xs font-medium text-text-secondary" htmlFor="create-path-name">
        {t('market.createName')}
      </label>
      <input
        id="create-path-name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void submit()
          }
        }}
        placeholder={t('path.newPlaceholder')}
        className="mb-4 w-full rounded-lg border border-border bg-bg-primary px-2.5 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent"
      />

      <label className="mb-1.5 block text-xs font-medium text-text-secondary" htmlFor="create-path-desc">
        {t('market.createDescription')}
      </label>
      <textarea
        id="create-path-desc"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder={t('path.descriptionPlaceholder')}
        className="mb-4 w-full resize-y rounded-lg border border-border bg-bg-primary px-2.5 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent"
      />

      <span className="mb-1.5 block text-xs font-medium text-text-secondary">{t('path.cover')}</span>
      <div className="mb-4">
        <PathCoverPicker
          mode={coverMode}
          onModeChange={setCoverMode}
          color={coverColor}
          onColorChange={setCoverColor}
          file={coverFile}
          onFileChange={setCoverFile}
        />
      </div>

      <span className="mb-1.5 block text-xs font-medium text-text-secondary">{t('path.visibility')}</span>
      <div className="mb-5 grid grid-cols-3 gap-1.5">
        {VISIBILITY.map(({ value, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setVisibility_(value)}
            aria-pressed={visibility === value}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors',
              visibility === value
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border-subtle text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {t(`path.visibility.${value}`)}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!title.trim() || busy || (coverMode === 'image' && !coverFile)}
          className="rounded-lg border border-accent bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? t('common.saving') : t('market.createSubmit')}
        </button>
      </div>
    </Dialog>
  )
}
