import { Download, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { useAppUpdateStore } from '@/lib/store/useAppUpdateStore'
import { useUIStore } from '@/lib/store/useUIStore'

export function UpdateDialog() {
  const { t } = useTranslation()
  const update = useAppUpdateStore((state) => state.update)
  const status = useAppUpdateStore((state) => state.status)
  const progress = useAppUpdateStore((state) => state.progress)
  const install = useAppUpdateStore((state) => state.install)
  const remindLater = useAppUpdateStore((state) => state.remindLater)
  const skipVersion = useAppUpdateStore((state) => state.skipVersion)
  const addToast = useUIStore((state) => state.addToast)
  const installing = status === 'installing'

  const startInstall = async () => {
    try {
      await install()
    } catch (error) {
      console.warn('Update installation failed', error)
      addToast(t('updater.failed'), 'error', { duration: 8_000 })
    }
  }

  return (
    <Dialog
      open={Boolean(update)}
      onClose={() => { if (!installing) remindLater() }}
      labelledBy="app-update-title"
      describedBy="app-update-description"
      initialFocus="[data-update-later]"
      closeOnBackdrop={!installing}
      className="mx-4 w-full max-w-md overflow-hidden rounded-xl border border-border-subtle bg-bg-secondary"
    >
      {update && <>
        <div className="px-6 py-5">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
              {installing ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            </span>
            <div className="min-w-0">
              <h2 id="app-update-title" className="text-md font-semibold text-text-primary">
                {installing
                  ? t('updater.installing', { version: update.version })
                  : t('updater.availableTitle', { version: update.version })}
              </h2>
              <p id="app-update-description" className="mt-1 text-sm leading-relaxed text-text-secondary">
                {installing ? t('updater.installingDescription') : t('updater.availableDescription')}
              </p>
            </div>
          </div>

          {!installing && update.notes && (
            <div className="mt-4 max-h-36 overflow-y-auto whitespace-pre-wrap rounded-lg bg-bg-primary p-3 text-sm leading-relaxed text-text-secondary">
              {update.notes}
            </div>
          )}

          {installing && (
            <div className="mt-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-tertiary" role="progressbar" aria-label={t('updater.downloadProgress')} aria-valuenow={progress ?? undefined}>
                <div className={progress === null ? 'h-full w-1/3 animate-pulse rounded-full bg-accent' : 'h-full rounded-full bg-accent transition-[width] duration-150'} style={progress === null ? undefined : { width: `${progress}%` }} />
              </div>
              {progress !== null && <p className="mt-2 text-right text-xs text-text-muted">{progress}%</p>}
            </div>
          )}
        </div>

        {!installing && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle bg-bg-primary px-6 py-3">
            <button type="button" onClick={skipVersion} className="mr-auto h-9 px-2 text-sm font-medium text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
              {t('updater.skipVersion')}
            </button>
            <button type="button" data-update-later onClick={remindLater} className="h-9 rounded-md border border-border-subtle px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
              {t('updater.later')}
            </button>
            <button type="button" onClick={() => void startInstall()} className="h-9 rounded-md bg-accent px-4 text-sm font-semibold text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
              {t('updater.updateNow')}
            </button>
          </div>
        )}
      </>}
    </Dialog>
  )
}
