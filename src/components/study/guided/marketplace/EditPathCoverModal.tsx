import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { useGuidedEditorStore } from '@/lib/store/useGuidedEditorStore'
import type { StudyPath } from '@/lib/study/guidedEditorApi'
import { DEFAULT_PATH_COVER_COLOR } from './PathCover'
import { PathCoverPicker, type PathCoverMode } from './PathCoverPicker'

export function EditPathCoverModal({
  open,
  path,
  onClose,
}: {
  open: boolean
  path: StudyPath
  onClose: () => void
}) {
  const { t } = useTranslation()
  const setCoverColor = useGuidedEditorStore((state) => state.setCoverColor)
  const uploadCover = useGuidedEditorStore((state) => state.uploadCover)
  const removeCover = useGuidedEditorStore((state) => state.removeCover)
  const error = useGuidedEditorStore((state) => state.error)
  const [mode, setMode] = useState<PathCoverMode>(path.cover_image_url ? 'image' : 'color')
  const [color, setColor] = useState(path.cover_color || DEFAULT_PATH_COVER_COLOR)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    useGuidedEditorStore.setState({ error: null })
    setMode(path.cover_image_url ? 'image' : 'color')
    setColor(path.cover_color || DEFAULT_PATH_COVER_COLOR)
    setFile(null)
  }, [open, path.cover_color, path.cover_image_url])

  const save = async () => {
    if (busy || (mode === 'image' && !file && !path.cover_image_url)) return
    setBusy(true)

    const colorSaved = await setCoverColor(path.slug, color)
    if (!colorSaved) {
      setBusy(false)
      return
    }

    const mediaSaved = mode === 'image'
      ? (file ? await uploadCover(path.slug, file) : true)
      : (path.cover_image_url ? await removeCover(path.slug) : true)

    setBusy(false)
    if (mediaSaved) onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="edit-path-cover-title"
      className="relative mx-4 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 id="edit-path-cover-title" className="text-md font-semibold text-text-primary">{t('path.coverEdit')}</h2>
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary">
          <X className="h-4 w-4" />
        </button>
      </div>

      <PathCoverPicker
        mode={mode}
        onModeChange={setMode}
        color={color}
        onColorChange={setColor}
        imageUrl={path.cover_image_url}
        file={file}
        onFileChange={setFile}
      />

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary">
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || (mode === 'image' && !file && !path.cover_image_url)}
          className="rounded-lg border border-accent bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </Dialog>
  )
}
