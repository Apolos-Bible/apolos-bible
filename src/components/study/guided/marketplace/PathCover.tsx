import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { hueOf } from './hue'

export const DEFAULT_PATH_COVER_COLOR = '#3b2a76'

export const PATH_COVER_SWATCHES = [
  '#3b2a76',
  '#8f3e47',
  '#a8662b',
  '#668f32',
  '#267567',
  '#27648a',
  '#374b78',
  '#6e477b',
] as const

function validColor(color: string | null | undefined): string | null {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : null
}

function mix(hex: string, target: 0 | 255, amount: number): string {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16)
    return Math.round(value + (target - value) * amount).toString(16).padStart(2, '0')
  })
  return `#${channels.join('')}`
}

export function pathCoverGradient(color: string | null | undefined, slug: string): string {
  const selected = validColor(color)
  if (!selected) {
    const hue = hueOf(slug)
    return `linear-gradient(135deg, hsl(${hue} 62% 40%), hsl(${(hue + 48) % 360} 58% 24%))`
  }

  return `linear-gradient(135deg, ${mix(selected, 255, 0.12)}, ${mix(selected, 0, 0.42)})`
}

export function PathCoverBackground({
  imageUrl,
  color,
  slug,
  className,
  eager = false,
}: {
  imageUrl?: string | null
  color?: string | null
  slug: string
  className?: string
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [imageUrl])

  return (
    <span
      aria-hidden
      className={cn('absolute inset-0 overflow-hidden', className)}
      style={{ background: pathCoverGradient(color, slug) }}
    >
      {imageUrl && !failed && (
        <img
          src={imageUrl}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </span>
  )
}
