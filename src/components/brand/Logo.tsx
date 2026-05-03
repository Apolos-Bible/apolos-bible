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
    <img
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      className={cn('object-contain', className)}
      aria-hidden="true"
    />
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
