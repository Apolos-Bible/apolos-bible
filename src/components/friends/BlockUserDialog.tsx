import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'

interface BlockUserDialogProps {
  open: boolean
  userName: string
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}

export function BlockUserDialog({ open, userName, busy = false, onClose, onConfirm }: BlockUserDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog
      open={open}
      onClose={() => { if (!busy) onClose() }}
      labelledBy="block-user-title"
      describedBy="block-user-description"
      initialFocus="[data-block-user-cancel]"
      closeOnBackdrop={!busy}
      className="mx-4 w-full max-w-sm overflow-hidden rounded-xl border border-border-subtle bg-bg-secondary shadow-2xl"
    >
      <div className="px-5 py-4">
        <h2 id="block-user-title" className="text-md font-semibold text-text-primary">
          {t('friend.blockConfirmTitle', { name: userName })}
        </h2>
        <p id="block-user-description" className="mt-2 text-sm leading-relaxed text-text-secondary">
          {t('friend.blockConfirmDescription')}
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-border-subtle bg-bg-primary px-5 py-3">
        <button type="button" data-block-user-cancel disabled={busy} onClick={onClose} className="h-9 rounded-md border border-border-subtle px-4 text-sm font-medium text-text-secondary hover:bg-bg-tertiary disabled:opacity-50">
          {t('common.cancel')}
        </button>
        <button type="button" disabled={busy} onClick={onConfirm} className="h-9 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
          {t('friend.block')}
        </button>
      </div>
    </Dialog>
  )
}
