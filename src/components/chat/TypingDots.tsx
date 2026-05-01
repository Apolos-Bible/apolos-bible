import { useTranslation } from 'react-i18next'

interface TypingDotsProps {
  names: string[]
}

export function TypingDots({ names }: TypingDotsProps) {
  const { t } = useTranslation()

  if (names.length === 0) return null

  const label =
    names.length === 1 ? t('chat.isTyping', { name: names[0] }) :
    names.length === 2 ? t('chat.areTyping', { name1: names[0], name2: names[1] }) :
    t('chat.othersTyping', { name: names[0], count: names.length - 1 })

  return (
    <div className="flex items-center gap-1.5 text-2xs text-text-muted py-1">
      <span className="flex items-center gap-0.5">
        <span className="w-1 h-1 rounded-full bg-text-muted animate-pulse [animation-delay:0ms]" />
        <span className="w-1 h-1 rounded-full bg-text-muted animate-pulse [animation-delay:150ms]" />
        <span className="w-1 h-1 rounded-full bg-text-muted animate-pulse [animation-delay:300ms]" />
      </span>
      <span>{label}…</span>
    </div>
  )
}
