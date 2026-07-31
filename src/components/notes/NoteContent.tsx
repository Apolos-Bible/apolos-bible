import type { MouseEvent } from 'react'
import { cn } from '@/lib/cn'
import { noteHtml } from '@/lib/richNotes'

interface NoteContentProps {
  body: string
  className?: string
  clamp?: boolean
}

export function NoteContent({ body, className, clamp = false }: NoteContentProps) {
  const html = noteHtml(body)
  if (!html) {
    return <div className={cn('whitespace-pre-wrap break-words', clamp && 'line-clamp-3', className)}>{body}</div>
  }

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as HTMLElement).closest('a')
    if (!link?.href) return
    event.preventDefault()
    window.open(link.href, '_blank', 'noopener,noreferrer')
  }

  return <div onClick={handleClick} className={cn('note-rich-content', clamp && 'note-rich-content-clamp', className)} dangerouslySetInnerHTML={{ __html: html }} />
}
