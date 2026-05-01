

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

type TypingIndicatorProps = {
  email: string
  className?: string
}

export function TypingIndicator({ email, className }: TypingIndicatorProps) {
  const { t } = useTranslation()

  return (
    <div className={cn('flex items-center gap-1 text-[10px] text-text-muted', className)}>
      <span className="flex items-center gap-0.5">
        <span className="w-1 h-1 rounded-full bg-text-muted animate-bounce [animation-delay:0ms]" />
        <span className="w-1 h-1 rounded-full bg-text-muted animate-bounce [animation-delay:150ms]" />
        <span className="w-1 h-1 rounded-full bg-text-muted animate-bounce [animation-delay:300ms]" />
      </span>
      <span>{t('chat.isWriting', { email })}</span>
    </div>
  )
}
