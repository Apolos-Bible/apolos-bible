import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTutorialStore } from '@/lib/store/useTutorialStore'
import { modKey } from '@/lib/platform'

type Rect = { top: number; left: number; width: number; height: number }

const PAD = 10
const TOOLTIP_W = 320
const TOOLTIP_GAP = 16
const VIEWPORT_PAD = 12

function getRect(selector: string | null): { rect: Rect | null; el: HTMLElement | null; found: boolean } {
  if (!selector) return { rect: null, el: null, found: true }
  // Some anchors (e.g. the Sidebar) are rendered twice — once in the mobile
  // drawer and once in the desktop layout — with one of them hidden via
  // display:none. Pick the first match that actually has a visible box.
  const all = Array.from(document.querySelectorAll(selector)) as HTMLElement[]
  if (all.length === 0) return { rect: null, el: null, found: false }
  for (const candidate of all) {
    const r = candidate.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) {
      return { rect: { top: r.top, left: r.left, width: r.width, height: r.height }, el: candidate, found: true }
    }
  }
  // Found in DOM but none visible yet — return the first so retry logic kicks in
  return { rect: null, el: all[0] ?? null, found: true }
}

export function TutorialOverlay() {
  const { t } = useTranslation()
  const active = useTutorialStore((s) => s.active)
  const step   = useTutorialStore((s) => s.step)
  const steps  = useTutorialStore((s) => s.steps)
  const next   = useTutorialStore((s) => s.next)
  const prev   = useTutorialStore((s) => s.prev)
  const skip   = useTutorialStore((s) => s.skip)

  const current = steps[step]
  const [rect, setRect] = useState<Rect | null>(null)
  const [vw, setVw]     = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const [vh, setVh]     = useState(typeof window !== 'undefined' ? window.innerHeight : 768)
  const [tooltipHeight, setTooltipHeight] = useState(180)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    if (!active || !current) return

    let cancelled = false
    let attempts = 0
    const timeouts: number[] = []

    const update = () => {
      if (cancelled) return
      const { rect: r, el, found } = getRect(current.target)
      setVw(window.innerWidth)
      setVh(window.innerHeight)

      if ((!found || !r) && attempts < 20) {
        // Routes and responsive chrome may still be mounting or animating.
        attempts++
        setRect(null)
        timeouts.push(window.setTimeout(update, 100))
        return
      }

      if (!r) {
        if (current.target) {
          // eslint-disable-next-line no-console
          console.warn('[Apolos tour] visible target not found:', current.target)
        }
        setRect(null)
        return
      }

      if (r && el) {
        // Make sure the target is visible
        const offscreen =
          r.top < 0 || r.left < 0 || r.top + r.height > window.innerHeight || r.left + r.width > window.innerWidth
        if (offscreen) {
          el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' })
          timeouts.push(window.setTimeout(update, 100))
          return
        }
      }

      setRect(r)
    }

    // Reset to null first so we don't show the previous step's spotlight while
    // re-measuring the new one
    setRect(null)
    update()
    timeouts.push(window.setTimeout(update, 60))

    const onWin = () => update()
    const mutations = new MutationObserver(onWin)
    mutations.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', onWin)
    window.addEventListener('scroll', onWin, true)
    return () => {
      cancelled = true
      timeouts.forEach((id) => window.clearTimeout(id))
      window.removeEventListener('resize', onWin)
      window.removeEventListener('scroll', onWin, true)
      mutations.disconnect()
    }
  }, [active, current, step])

  useLayoutEffect(() => {
    if (!active || !tooltipRef.current) return
    const card = tooltipRef.current
    const updateHeight = () => setTooltipHeight(card.getBoundingClientRect().height)
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(card)
    return () => observer.disconnect()
  }, [active, step])

  useEffect(() => {
    if (!active) return
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    return () => {
      previouslyFocused?.focus()
    }
  }, [active])

  useEffect(() => {
    if (!active) return
    const frame = window.requestAnimationFrame(() => nextButtonRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [active, step])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); skip() }
      else if (e.key === 'Tab') {
        const focusable = Array.from(
          tooltipRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? [],
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      } else {
        const target = e.target instanceof HTMLElement ? e.target : null
        if (target?.closest('button, a, input, select, textarea, [contenteditable="true"]')) return
        if (e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); next() }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, next, prev, skip])

  if (!active || !current) return null

  const placement = vw < 768
    ? current.mobilePlacement ?? current.placement ?? 'bottom'
    : current.placement ?? 'bottom'
  const isCentered = !rect || placement === 'center'
  const tooltipWidth = Math.max(0, Math.min(TOOLTIP_W, vw - VIEWPORT_PAD * 2))

  let tipTop = vh / 2 - tooltipHeight / 2
  let tipLeft = vw / 2 - tooltipWidth / 2

  if (rect && !isCentered) {
    if (placement === 'right') {
      tipLeft = rect.left + rect.width + TOOLTIP_GAP
      tipTop  = rect.top + rect.height / 2 - tooltipHeight / 2
    } else if (placement === 'left') {
      tipLeft = rect.left - tooltipWidth - TOOLTIP_GAP
      tipTop  = rect.top + rect.height / 2 - tooltipHeight / 2
    } else if (placement === 'top') {
      tipLeft = rect.left + rect.width / 2 - tooltipWidth / 2
      tipTop  = rect.top - tooltipHeight - TOOLTIP_GAP
    } else {
      tipLeft = rect.left + rect.width / 2 - tooltipWidth / 2
      tipTop  = rect.top + rect.height + TOOLTIP_GAP
    }
  }
  tipLeft = Math.max(VIEWPORT_PAD, Math.min(tipLeft, vw - tooltipWidth - VIEWPORT_PAD))
  tipTop = Math.max(VIEWPORT_PAD, Math.min(tipTop, vh - tooltipHeight - VIEWPORT_PAD))

  const isFirst = step === 0
  const isLast  = step === steps.length - 1

  // Spotlight position (animates smoothly between steps via CSS transitions)
  const spotTop    = rect ? rect.top - PAD : vh / 2
  const spotLeft   = rect ? rect.left - PAD : vw / 2
  const spotWidth  = rect ? rect.width + PAD * 2 : 0
  const spotHeight = rect ? rect.height + PAD * 2 : 0

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="apolos-tour-title" aria-describedby="apolos-tour-description">
      <style>{`
        @keyframes apolos-tour-pulse {
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 55%, transparent), 0 0 40px 8px color-mix(in srgb, var(--accent) 25%, transparent); }
          50%      { box-shadow: 0 0 0 8px transparent, 0 0 60px 16px color-mix(in srgb, var(--accent) 35%, transparent); }
        }
        @keyframes apolos-tour-glow {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        @keyframes apolos-tour-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Full-screen dim for centered steps. The overlay itself blocks the app
          beneath it while the tour is active. */}
      {isCentered && (
        <div className="absolute inset-0 bg-black/65" />
      )}

      {/* Spotlight: a transparent box that "punches" a hole in the dim
          using a huge box-shadow. CSS transitions animate between steps. */}
      {!isCentered && rect && (
        <>
          <div
            aria-hidden="true"
            className="absolute rounded-xl"
            style={{
              top: spotTop,
              left: spotLeft,
              width: spotWidth,
              height: spotHeight,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.72)',
              transition: 'top 150ms, left 150ms, width 150ms, height 150ms',
            }}
          />
          {/* Pulsing accent ring */}
          <div
            aria-hidden="true"
            className="absolute rounded-xl border border-accent/80"
            style={{
              top: spotTop,
              left: spotLeft,
              width: spotWidth,
              height: spotHeight,
              animation: 'apolos-tour-pulse 2.2s ease-in-out infinite',
              transition: 'top 150ms, left 150ms, width 150ms, height 150ms',
            }}
          />
          {/* Soft inner glow tint over the highlighted area */}
          <div
            aria-hidden="true"
            className="absolute rounded-xl"
            style={{
              top: spotTop,
              left: spotLeft,
              width: spotWidth,
              height: spotHeight,
              background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 70%)',
              animation: 'apolos-tour-glow 2.6s ease-in-out infinite',
              transition: 'top 150ms, left 150ms, width 150ms, height 150ms',
            }}
          />
        </>
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        key={step}
        className="absolute rounded-lg border border-border-subtle bg-bg-secondary p-4"
        style={{
          width: tooltipWidth,
          top: tipTop,
          left: tipLeft,
          animation: 'apolos-tour-fade-in 220ms ease-out',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-2xs uppercase tracking-wider text-text-muted">
            {t('tutorial.stepCount', { current: step + 1, total: steps.length })}
          </p>
          <button
            onClick={skip}
            className="text-text-muted hover:text-text-secondary text-xs transition-colors"
          >
            {t('tutorial.skip')}
          </button>
        </div>
        <h3 id="apolos-tour-title" className="mt-2 text-sm font-medium text-text-primary">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(t as any)(current.titleKey)}
        </h3>
        <p id="apolos-tour-description" className="mt-1.5 text-xs text-text-secondary leading-relaxed">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(t as any)(current.bodyKey, { modKey })}
        </p>

        {/* Progress dots */}
        <div className="mt-3 flex items-center gap-1">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i === step ? 'bg-accent' : i < step ? 'bg-accent/40' : 'bg-text-muted/25'
              }`}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={prev}
            disabled={isFirst}
            className="rounded px-2.5 py-1 text-xs text-text-muted hover:text-text-secondary hover:bg-bg-tertiary transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          >
            {t('tutorial.back')}
          </button>
          <button
            ref={nextButtonRef}
            onClick={next}
            className="rounded bg-accent px-3 py-1 text-xs font-medium text-bg-primary hover:opacity-90 transition-opacity"
          >
            {isLast ? t('tutorial.done') : t('tutorial.next')}
          </button>
        </div>
      </div>
    </div>
  )
}
