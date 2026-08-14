import { LogOut, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/lib/store/useAuthStore'

export function ImpersonationBanner() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const impersonation = user?.impersonation

  if (!user || !impersonation?.active) return null

  const stop = async () => {
    const returnUrl = impersonation.return_url
    await logout()
    window.location.assign(returnUrl)
  }

  return (
    <aside className="fixed inset-x-0 top-0 z-[100] flex min-h-10 items-center justify-center gap-4 border-b border-accent bg-bg-secondary px-4 py-2 text-xs font-medium text-text-primary sm:text-sm">
      <ShieldAlert size={16} className="text-accent" aria-hidden="true" />
      <span>
        {t('impersonation.banner', {
          user: user.name,
          admin: impersonation.impersonator.name,
        })}
      </span>
      <button
        type="button"
        onClick={() => void stop()}
        className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 transition-colors duration-75 hover:bg-bg-tertiary"
      >
        <LogOut size={13} aria-hidden="true" />
        {t('impersonation.stop')}
      </button>
    </aside>
  )
}
