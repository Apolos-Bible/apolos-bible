import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Palette } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PathCoverBackground, PATH_COVER_SWATCHES } from './PathCover'

export type PathCoverMode = 'image' | 'color'

export function PathCoverPicker({
  mode,
  onModeChange,
  color,
  onColorChange,
  imageUrl,
  file,
  onFileChange,
}: {
  mode: PathCoverMode
  onModeChange: (mode: PathCoverMode) => void
  color: string
  onColorChange: (color: string) => void
  imageUrl?: string | null
  file: File | null
  onFileChange: (file: File | null) => void
}) {
  const { t } = useTranslation()
  const inputId = useId()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }

    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const shownImage = mode === 'image' ? (previewUrl ?? imageUrl) : null

  return (
    <div className="space-y-3">
      <div className="relative h-32 overflow-hidden rounded-xl border border-border-subtle">
        <PathCoverBackground imageUrl={shownImage} color={color} slug="cover-preview" eager />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
      </div>

      <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={t('path.coverType')}>
        <button
          type="button"
          onClick={() => onModeChange('image')}
          aria-pressed={mode === 'image'}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors',
            mode === 'image'
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border-subtle text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
          )}
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {t('path.coverPhoto')}
        </button>
        <button
          type="button"
          onClick={() => onModeChange('color')}
          aria-pressed={mode === 'color'}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors',
            mode === 'color'
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border-subtle text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
          )}
        >
          <Palette className="h-3.5 w-3.5" />
          {t('path.coverColor')}
        </button>
      </div>

      {mode === 'image' ? (
        <div>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
          <label
            htmlFor={inputId}
            className="flex cursor-pointer items-center justify-center rounded-lg border border-border-subtle px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
          >
            {file ? file.name : imageUrl ? t('path.coverReplacePhoto') : t('path.coverChoosePhoto')}
          </label>
          <p className="mt-1.5 text-2xs leading-relaxed text-text-muted">{t('path.coverPhotoHint')}</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {PATH_COVER_SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={t('path.coverChooseColor', { color: swatch })}
              aria-pressed={color.toLowerCase() === swatch}
              onClick={() => onColorChange(swatch)}
              className={cn(
                'h-7 w-7 rounded-full border transition-transform hover:scale-105',
                color.toLowerCase() === swatch ? 'border-text-primary ring-2 ring-accent/40' : 'border-border-subtle',
              )}
              style={{ backgroundColor: swatch }}
            />
          ))}
          <label className="relative h-7 w-7 overflow-hidden rounded-full border border-border-subtle" title={t('path.coverCustomColor')}>
            <input
              type="color"
              value={color}
              onChange={(event) => onColorChange(event.target.value)}
              aria-label={t('path.coverCustomColor')}
              className="absolute -inset-2 h-11 w-11 cursor-pointer border-0 bg-transparent p-0"
            />
          </label>
        </div>
      )}
    </div>
  )
}
