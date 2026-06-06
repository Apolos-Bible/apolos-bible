import { useState } from 'react'
import { cn } from '@/lib/cn'

interface UserAvatarProps {
  /** Display name — first letter is used as the fallback initial. */
  name?: string | null
  /** Email — used for the initial when no name, and as the tooltip. */
  email?: string | null
  /** Avatar image URL. When set (and loadable) it replaces the initial. */
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  xs:  'w-5 h-5 text-2xs',
  sm:  'w-5 h-5 text-2xs',
  md:  'w-7 h-7 text-xs',
  lg:  'w-10 h-10 text-base',
  xl:  'w-14 h-14 text-xl',
  '2xl': 'w-20 h-20 text-3xl',
}

export function UserAvatar({ name, email, src, size = 'md', className }: UserAvatarProps) {
  const [broken, setBroken] = useState(false)
  const seed = (name?.trim() || email?.trim() || '?')
  const initial = seed.charAt(0).toUpperCase()
  const showImage = !!src && !broken

  return (
    <span
      title={name || email || undefined}
      className={cn(
        'rounded-full font-medium flex items-center justify-center shrink-0 overflow-hidden select-none',
        showImage ? 'bg-bg-tertiary' : 'bg-accent/20 text-accent',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={src as string}
          alt={name || email || ''}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        initial
      )}
    </span>
  )
}
