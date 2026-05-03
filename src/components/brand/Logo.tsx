import { cn } from '@/lib/cn'

interface LogoIconProps {
  size?: number
  className?: string
  inkColor?: string
  accentColor?: string
}

export function LogoIcon({
  size = 22,
  className,
  inkColor = 'currentColor',
  accentColor = '#c8a96a',
}: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      shapeRendering="geometricPrecision"
      aria-hidden="true"
    >
      <line x1="32" y1="14" x2="14" y2="48" stroke={inkColor} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="32" y1="14" x2="50" y2="48" stroke={inkColor} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="14" y1="48" x2="50" y2="48" stroke={accentColor} strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="14" r="3.2" fill={inkColor} />
      <circle cx="14" cy="48" r="3.2" fill={inkColor} />
      <circle cx="50" cy="48" r="3.2" fill={inkColor} />
    </svg>
  )
}

interface LogoProps {
  symbolSize?: number
  textSize?: number
  className?: string
}

export function Logo({ symbolSize = 20, textSize = 13, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LogoIcon size={symbolSize} className="text-text-primary shrink-0" />
      <span
        className="font-reading tracking-[-0.02em] leading-none whitespace-nowrap"
        style={{ fontSize: textSize }}
      >
        <span className="text-text-primary">tulia</span>
        <span className="text-accent">.</span>
        <span className="text-text-primary">study</span>
      </span>
    </div>
  )
}

interface LogoStackedProps {
  symbolSize?: number
  textSize?: number
  className?: string
}

export function LogoStacked({ symbolSize = 48, textSize = 22, className }: LogoStackedProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3.5', className)}>
      <LogoIcon size={symbolSize} className="text-text-primary" />
      <span
        className="font-reading tracking-[-0.02em] leading-none whitespace-nowrap"
        style={{ fontSize: textSize }}
      >
        <span className="text-text-primary">tulia</span>
        <span className="text-accent">.</span>
        <span className="text-text-primary">study</span>
      </span>
    </div>
  )
}
