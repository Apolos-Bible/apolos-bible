import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useChatStore } from '@/lib/store/useChatStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { cn } from '@/lib/cn'

interface MessageInputProps {
  conversationId: number
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const send         = useChatStore(s => s.send)
  const notifyTyping = useChatStore(s => s.notifyTyping)
  const addToast     = useUIStore(s => s.addToast)

  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setBody('')
    textareaRef.current?.focus()
  }, [conversationId])

  const autoresize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const submit = async () => {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await send(conversationId, trimmed)
      setBody('')
      autoresize()
    } catch {
      addToast('Could not send message', 'error')
    } finally {
      setSending(false)
    }
  }

  const handleChange = (value: string) => {
    setBody(value)
    if (value.trim().length > 0) notifyTyping(conversationId)
  }

  return (
    <div className="border-t border-border-subtle px-3 py-2.5 shrink-0">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => { handleChange(e.target.value); autoresize() }}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Write a message…"
          className={cn(
            'flex-1 resize-none bg-bg-secondary rounded-md border border-border-subtle',
            'text-sm text-text-primary placeholder:text-text-muted',
            'px-3 py-2 outline-none focus:border-border-hover',
            'max-h-40',
          )}
        />
        <button
          onClick={submit}
          disabled={sending || body.trim().length === 0}
          className={cn(
            'shrink-0 h-8 px-3 rounded-md text-xs font-medium transition-colors',
            'flex items-center gap-1.5',
            body.trim().length === 0 || sending
              ? 'bg-bg-tertiary text-text-muted cursor-not-allowed'
              : 'bg-accent text-bg-primary hover:brightness-110',
          )}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3.5 h-3.5">
            <path d="M2 8l11-5-3 11-3-4-5-2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Send
        </button>
      </div>
    </div>
  )
}
