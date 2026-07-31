import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'

interface RemoveFriendDialogProps {
  open: boolean
  friendName: string
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}

export function RemoveFriendDialog({
  open,
  friendName,
  busy = false,
  onClose,
  onConfirm,
}: RemoveFriendDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog
      open={open}
      onClose={() => { if (!busy) onClose() }}
      labelledBy="remove-friend-title"
      describedBy="remove-friend-description"
      initialFocus="[data-remove-friend-cancel]"
      closeOnBackdrop={!busy}
      className="mx-4 w-full max-w-sm overflow-hidden rounded-xl border border-border-subtle bg-bg-secondary shadow-2xl"
    >
      <div className="px-5 py-4">
        <h2 id="remove-friend-title" className="text-md font-semibold text-text-primary">
          {t('friends.removeConfirmTitle', { name: friendName })}
        </h2>
        <p id="remove-friend-description" className="mt-2 text-sm leading-relaxed text-text-secondary">
          {t('friends.removeConfirmDescription')}
        </p>
      </div>

      <div className="flex justify-end gap-2 border-t border-border-subtle bg-bg-primary px-5 py-3">
        <button
          type="button"
          data-remove-friend-cancel
          disabled={busy}
          onClick={onClose}
          className="h-9 rounded-md border border-border-subtle px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="h-9 rounded-md bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
        >
          {busy ? t('friends.removing') : t('friends.removeConfirmAction')}
        </button>
      </div>
    </Dialog>
  )
}
