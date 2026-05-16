import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/lib/store/useChatStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { bibleApi, type ApiSearchResult } from '@/lib/bibleApi'
import { CHAT_COMMANDS, filterCommands, type ChatCommand } from './chatCommands'
import { normalizeText } from '@/lib/normalizeText'
import { CommandPicker } from './CommandPicker'
import { VerseAutocomplete } from './VerseAutocomplete'
import { cn } from '@/lib/cn'

interface MessageInputProps {
  conversationId: number
}

// /v  (no space yet) → command picker mode
const IS_CMD_MODE   = /^\/\S*$/
// /v  (with space)  → verse autocomplete mode
const IS_VERSE_MODE = /^\/v\s/

export function MessageInput({ conversationId }: MessageInputProps) {
  const { t }        = useTranslation()
  const send         = useChatStore(s => s.send)
  const notifyTyping = useChatStore(s => s.notifyTyping)
  const addToast     = useUIStore(s => s.addToast)
  const versionId    = useVerseStore(s => s.versionId)

  const [body, setBody]       = useState('')
  const [sending, setSending] = useState(false)

  // Command picker state
  const [cmdActive, setCmdActive] = useState(0)

  // Verse autocomplete state
  const [acResults, setAcResults] = useState<ApiSearchResult[]>([])
  const [acLoading, setAcLoading] = useState(false)
  const [acActive, setAcActive]   = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isCmdMode   = IS_CMD_MODE.test(body)
  const isVerseMode = IS_VERSE_MODE.test(body)
  const filteredCmds = isCmdMode ? filterCommands(body) : CHAT_COMMANDS
  const acQuery     = isVerseMode ? body.replace(/^\/v\s*/, '') : ''

  useEffect(() => {
    setBody('')
    textareaRef.current?.focus()
  }, [conversationId])

  // Reset command picker index when filtered list changes
  useEffect(() => {
    setCmdActive(0)
  }, [body])

  // Fetch verse search results, debounced 300 ms
  useEffect(() => {
    if (!isVerseMode || !acQuery.trim()) {
      setAcResults([])
      setAcLoading(false)
      return
    }
    setAcLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await bibleApi.search(versionId, normalizeText(acQuery.trim()))
        setAcResults(res.slice(0, 6))
        setAcActive(0)
      } catch {
        setAcResults([])
      } finally {
        setAcLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [acQuery, isVerseMode, versionId])

  const activateCommand = (cmd: ChatCommand) => {
    setBody(`/${cmd.trigger} `)
    textareaRef.current?.focus()
  }

  const insertVerse = (r: ApiSearchResult) => {
    const ref = `${r.book} ${r.chapter}:${r.verse}`
    setBody(ref)
    setAcResults([])
    textareaRef.current?.focus()
    requestAnimationFrame(() => autoresize())
  }

  const autoresize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isCmdMode) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setCmdActive(i => Math.min(filteredCmds.length - 1, i + 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setCmdActive(i => Math.max(0, i - 1)); return }
      if (e.key === 'Enter')     { e.preventDefault(); const c = filteredCmds[cmdActive]; if (c) activateCommand(c); return }
      if (e.key === 'Escape')    { e.preventDefault(); setBody(''); return }
      if (e.key === 'Tab')       { e.preventDefault(); const c = filteredCmds[cmdActive]; if (c) activateCommand(c); return }
    }

    if (isVerseMode) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setAcActive(i => Math.min(acResults.length - 1, i + 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setAcActive(i => Math.max(0, i - 1)); return }
      if (e.key === 'Enter')     { e.preventDefault(); const r = acResults[acActive]; if (r) insertVerse(r); return }
      if (e.key === 'Escape')    { e.preventDefault(); setBody(''); setAcResults([]); return }
    }

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
      addToast(t('chat.sendFailed'), 'error')
    } finally {
      setSending(false)
    }
  }

  const handleChange = (value: string) => {
    setBody(value)
    if (value.trim().length > 0) notifyTyping(conversationId)
  }

  const hasText = body.trim().length > 0
  const sendDisabled = sending || !hasText

  return (
    <div className="relative border-t border-border-subtle px-3 md:px-3 py-3 md:py-2.5 shrink-0">
      {isCmdMode && (
        <CommandPicker
          commands={filteredCmds}
          activeIdx={cmdActive}
          onSelect={activateCommand}
          onHover={setCmdActive}
        />
      )}

      {isVerseMode && (
        <VerseAutocomplete
          query={acQuery}
          results={acResults}
          loading={acLoading}
          activeIdx={acActive}
          onSelect={insertVerse}
          onHover={setAcActive}
        />
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => { handleChange(e.target.value); autoresize() }}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={t('chat.messagePlaceholder')}
          className={cn(
            'flex-1 resize-none bg-bg-tertiary md:bg-bg-secondary rounded-2xl md:rounded-md border border-border-subtle focus:border-border-hover',
            'text-[15px] md:text-sm text-text-primary placeholder:text-text-muted',
            'px-4 md:px-3 py-2.5 md:py-2 outline-none',
            'max-h-40',
          )}
        />
        {/* Mobile: circular accent send button, only when there's text */}
        <button
          type="button"
          onClick={submit}
          disabled={sendDisabled}
          aria-label={t('chat.send')}
          className={cn(
            'md:hidden shrink-0 h-11 w-11 rounded-full flex items-center justify-center transition-all duration-150',
            hasText
              ? 'bg-accent text-bg-primary hover:brightness-110 scale-100 opacity-100'
              : 'bg-bg-tertiary text-text-muted scale-90 opacity-0 pointer-events-none',
          )}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M5 12l7-7 7 7M12 5v14" />
          </svg>
        </button>
        {/* Desktop: original labelled button unchanged */}
        <button
          type="button"
          onClick={submit}
          disabled={sendDisabled}
          className={cn(
            'hidden md:flex shrink-0 h-8 px-3 rounded-md text-xs font-medium transition-colors items-center gap-1.5',
            sendDisabled
              ? 'bg-bg-tertiary text-text-muted cursor-not-allowed'
              : 'bg-accent text-bg-primary hover:brightness-110',
          )}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3.5 h-3.5">
            <path d="M2 8l11-5-3 11-3-4-5-2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('chat.send')}
        </button>
      </div>
    </div>
  )
}
