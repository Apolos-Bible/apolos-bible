import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { getDiceBearAvatarUrl } from '@/lib/avatar'

interface UserAvatarProps {
  /** Display name — used as a last-resort seed when there is no email. */
  name?: string | null
  /** Email — hashed locally and used as the deterministic fallback seed. */
  email?: string | null
  /** Avatar image URL. When set (and loadable) it replaces the generated avatar. */
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
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)
  const [customBroken, setCustomBroken] = useState(false)
  const [fallbackBroken, setFallbackBroken] = useState(false)
  const identity = email?.trim() || name?.trim() || '?'

  useEffect(() => {
    let cancelled = false
    setFallbackUrl(null)
    setCustomBroken(false)
    setFallbackBroken(false)

    void getDiceBearAvatarUrl(identity).then((url) => {
      if (!cancelled) setFallbackUrl(url)
    })

    return () => {
      cancelled = true
    }
  }, [identity, src])

  const showCustomImage = !!src && !customBroken
  const showFallbackImage = !showCustomImage && !!fallbackUrl && !fallbackBroken
  const imageSrc = showCustomImage ? src : showFallbackImage ? fallbackUrl : null
  const initial = (name?.trim() || email?.trim() || '?').charAt(0).toUpperCase()

  return (
    <span
      title={name || email || undefined}
      className={cn(
        'rounded-full font-medium flex items-center justify-center shrink-0 overflow-hidden select-none',
        imageSrc ? 'bg-bg-tertiary' : 'bg-accent/20 text-accent',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={name || email || ''}
          className="h-full w-full object-cover"
          onError={() => {
            if (showCustomImage) setCustomBroken(true)
            else setFallbackBroken(true)
          }}
        />
      ) : (
        initial
      )}
    </span>
  )
}
