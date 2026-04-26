interface TypingDotsProps {
  names: string[]
}

export function TypingDots({ names }: TypingDotsProps) {
  if (names.length === 0) return null

  const label =
    names.length === 1 ? `${names[0]} is typing` :
    names.length === 2 ? `${names[0]} and ${names[1]} are typing` :
    `${names[0]} and ${names.length - 1} others are typing`

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
