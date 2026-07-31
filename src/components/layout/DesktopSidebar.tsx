import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '@/lib/store/useUIStore'
import { cn } from '@/lib/cn'

export function DesktopSidebar({ children, className }: { children: ReactNode; className?: string }) {
  const { t } = useTranslation()
  const collapsed = useUIStore((state) => state.desktopSidebarCollapsed)

  return (
    <aside
      className={cn(
        'hidden h-full shrink-0 overflow-hidden transition-[width] duration-200 ease-out md:block',
        collapsed ? 'w-[52px]' : 'w-sidebar',
        className,
      )}
      data-region="sidebar"
      aria-label={t('a11y.regionSidebar')}
      tabIndex={-1}
    >
      <div className={cn('h-full transition-[width] duration-200', collapsed ? 'w-[52px]' : 'w-sidebar')}>
        {children}
      </div>
    </aside>
  )
}
