import { useTranslation } from 'react-i18next'
import { useCommands } from '@/lib/keyboard'

/**
 * Landmark navigation for keyboard users.
 *
 * Regions opt in with `data-region="…"` + `tabIndex={-1}`. F6 cycles them the
 * way a desktop app cycles panes, and the skip link gives a mouse-free way into
 * the reader without tabbing through the whole book list first.
 */
export function RegionNav() {
  const { t } = useTranslation()

  const cycle = (delta: number) => {
    const regions = Array.from(document.querySelectorAll<HTMLElement>('[data-region]')).filter(
      // Both the mobile and desktop shells are in the DOM; only one is laid out.
      (el) => el.offsetParent != null || el.getBoundingClientRect().height > 0,
    )
    if (regions.length === 0) return false

    const active = document.activeElement as HTMLElement | null
    const current = active ? regions.findIndex((region) => region.contains(active)) : -1
    const next = regions[(current + delta + regions.length) % regions.length]
    next.focus()
  }

  useCommands({
    'app.cycleRegion': () => cycle(1),
    'app.cycleRegionBack': () => cycle(-1),
  })

  const skipTo = (selector: string) => () => {
    document.querySelector<HTMLElement>(selector)?.focus()
  }

  return (
    <div className="sr-only focus-within:not-sr-only">
      <button type="button" className="skip-link" onClick={skipTo('[data-region="reader"]')}>
        {t('a11y.skipToReader')}
      </button>
      <button type="button" className="skip-link" onClick={skipTo('[data-region="sidebar"]')}>
        {t('a11y.skipToSidebar')}
      </button>
    </div>
  )
}
