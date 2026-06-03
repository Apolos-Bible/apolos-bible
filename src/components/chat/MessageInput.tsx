import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Paperclip, Sparkles, X } from 'lucide-react'
import { useChatStore } from '@/lib/store/useChatStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useAiDocuments } from '@/hooks/useAiDocuments'
import { aiApi } from '@/lib/aiApi'
import { bibleApi, type ApiSearchResult } from '@/lib/bibleApi'
import { CHAT_COMMANDS, filterCommands, type ChatCommand } from './chatCommands'
import { normalizeText } from '@/lib/normalizeText'
import { CommandPicker } from './CommandPicker'
import { VerseAutocomplete } from './VerseAutocomplete'
import { cn } from '@/lib/cn'

interface MessageInputProps {
  conversationId: number
  /** When set, this is a study chat: "/tulia ..." also summons the assistant. */
  studySessionId?: string | null
}

// /v  (no space yet) → command picker mode
const IS_CMD_MODE   = /^\/\S*$/
// /v  (with space)  → verse autocomplete mode
const IS_VERSE_MODE = /^\/v\s/
// A leading "/tulia" routes the message to the AI assistant (prefix stripped).
// "/tulia" is also registered as a slash command, so it shows in the "/" picker.
const TULIA_PREFIX = /^\/tulia\b\s*/i

export function MessageInput({ conversationId, studySessionId = null }: MessageInputProps) {
  const { t }        = useTranslation()
  const send         = useChatStore(s => s.send)
  const askTulia     = useChatStore(s => s.askTulia)
  const notifyTyping = useChatStore(s => s.notifyTyping)
  const addToast     = useUIStore(s => s.addToast)
  const versionId    = useVerseStore(s => s.versionId)
  const userName     = useAuthStore(s => s.user?.name ?? null)
  const userId       = useAuthStore(s => s.user?.id)

  // Sticky "Modo Tulia": when armed, every message routes to the AI assistant
  // without a "/tulia" prefix. Only meaningful inside a study chat.
  const setComposerAudience = useChatStore(s => s.setComposerAudience)
  const composerAudience = useChatStore(s => s.composerAudience[conversationId])
  const armed = !!studySessionId && composerAudience === 'tulia'
  const arm   = () => setComposerAudience(conversationId, 'tulia')
  const disarm = () => setComposerAudience(conversationId, 'study')
  // Last message in the thread (to nudge back to humans if someone speaks).
  const lastMessage = useChatStore(s => {
    const m = s.messages[conversationId]
    return m && m.length ? m[m.length - 1] : null
  })
  const [showReturnNudge, setShowReturnNudge] = useState(false)
  // Tracks the last seen message id so the nudge only fires for messages that
  // arrive while armed (reset per conversation below).
  const prevLastIdRef = useRef<number | null>(null)

  // PDFs attached as shared context for Tulia (live in the study's Yjs doc).
  // `available` is false outside a study, hiding the attach affordance.
  const aiDocs = useAiDocuments()
  const canAttach = !!studySessionId && aiDocs.available

  const [body, setBody]             = useState('')
  const [sending, setSending]       = useState(false)
  const [extracting, setExtracting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
    // Reset nudge state so a stale id from a previous conversation can't misfire.
    setShowReturnNudge(false)
    prevLastIdRef.current = null
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

  // Focus the composer whenever Modo Tulia is (re)armed from any entry point
  // (pill, /tulia, tapping a Tulia bubble, Cmd/Ctrl+J).
  useEffect(() => {
    if (armed) textareaRef.current?.focus()
  }, [armed])

  // Safety net: auto-exit Modo Tulia after ~45s idle with an empty draft, so you
  // never stay silently pointed at the bot.
  useEffect(() => {
    if (!armed || body.trim() !== '') return
    const timer = setTimeout(() => setComposerAudience(conversationId, 'study'), 45000)
    return () => clearTimeout(timer)
  }, [armed, body, conversationId, setComposerAudience])

  // Soft nudge: if a human (not me, not Tulia) speaks while armed, gently suggest
  // returning to the study chat — but never auto-disarm (that would re-add the
  // friction we removed). Only fires for messages that ARRIVE while armed, not
  // for whatever happened to be the last message when you entered the mode.
  useEffect(() => {
    const id = lastMessage?.id ?? null
    const isNew = id !== prevLastIdRef.current
    prevLastIdRef.current = id
    if (!armed) { setShowReturnNudge(false); return }
    if (isNew && lastMessage && !lastMessage.is_ai && lastMessage.user_id !== userId) {
      setShowReturnNudge(true)
    }
  }, [armed, lastMessage, userId])

  const activateCommand = (cmd: ChatCommand) => {
    // "/tulia" arms Modo Tulia (no prefix to keep typing) instead of inserting text.
    if (cmd.trigger === 'tulia') {
      arm()
      setBody('')
      textareaRef.current?.focus()
      return
    }
    setBody(`/${cmd.trigger} `)
    textareaRef.current?.focus()
  }

  const insertVerse = (r: ApiSearchResult) => {
    const ref = `${r.book} ${r.chapter}:${r.verse}`
    setBody(ref)
    setAcResults([])
    textareaRef.current?.focus()
  }

  const autoresize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  // Keep the textarea height in sync with its content for EVERY body change —
  // typing, programmatic inserts, and clearing on send. useLayoutEffect runs
  // after React commits the new value to the DOM (before paint), so on send the
  // input reliably shrinks back to one row with no flicker.
  useLayoutEffect(() => {
    autoresize()
  }, [body])

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

    // Esc on an empty composer exits Modo Tulia (back to the human study chat).
    if (e.key === 'Escape' && armed && body.trim() === '') {
      e.preventDefault()
      disarm()
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const submit = async () => {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    // Route to Tulia when armed (sticky mode) or on a leading "/tulia".
    const hasTuliaPrefix = !!studySessionId && TULIA_PREFIX.test(trimmed)
    const goToTulia = !!studySessionId && (armed || hasTuliaPrefix)
    // Drop a leading "/tulia" so neither the posted message nor the prompt shows it.
    const outgoing = hasTuliaPrefix ? trimmed.replace(TULIA_PREFIX, '').trim() : trimmed
    // Bare "/tulia" (no question) just arms the mode — don't post an empty message.
    if (goToTulia && outgoing === '') {
      arm()
      setBody('')
      return
    }
    setSending(true)
    try {
      await send(conversationId, outgoing)
      setBody('') // height resets via the useLayoutEffect on [body]
      setShowReturnNudge(false)
      // The human message is always posted (visible to everyone). When directed
      // at Tulia, also summon the assistant (fire-and-forget; it owns its own
      // thinking indicator + bot reply) and LATCH sticky mode so the next turn
      // needs no prefix. Attached documents ride along as grounding context.
      if (goToTulia && studySessionId) {
        const documents = aiDocs.documents.map(d => ({ name: d.name, text: d.text }))
        void askTulia(conversationId, studySessionId, outgoing, documents)
        arm()
      }
    } catch {
      addToast(t('chat.sendFailed'), 'error')
    } finally {
      setSending(false)
    }
  }

  // Attach a PDF as shared context: extract its text server-side (token-free),
  // store it in the study's Yjs doc so every participant sees it, and announce
  // it in the thread. Nothing is added to the canvas.
  const attachPdf = async (file: File) => {
    if (!studySessionId || extracting) return
    setExtracting(true)
    try {
      const res = await aiApi.extractDocument(studySessionId, file)
      aiDocs.add({
        id: `doc-${Date.now()}`,
        name: res.name,
        text: res.text,
        truncated: res.truncated,
        addedBy: userName,
        addedAt: Date.now(),
      })
      void send(
        conversationId,
        t('study.ai.attached', '📄 Adjunté «{{name}}» como contexto para Tulia', { name: res.name }),
      ).catch(() => {})
    } catch (e) {
      const status = (e as { status?: number } | null)?.status
      const msg =
        status === 422
          ? t('study.ai.attachUnreadable', 'No pude leer ese PDF. ¿Tiene texto seleccionable?')
          : status === 403
            ? t('study.ai.errorVerify', 'Verifica tu correo para usar a Tulia.')
            : t('study.ai.attachFailed', 'No se pudo adjuntar el documento.')
      addToast(msg, 'error')
    } finally {
      setExtracting(false)
    }
  }

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (file) void attachPdf(file)
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


      {canAttach && aiDocs.documents.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-2">
          {aiDocs.documents.map((d) => (
            <span
              key={d.id}
              title={d.addedBy ? t('study.ai.attachedBy', 'Adjuntado por {{name}}', { name: d.addedBy }) : undefined}
              className="inline-flex items-center gap-1.5 max-w-[220px] rounded-md border border-border-subtle bg-bg-tertiary px-2 py-1 text-2xs text-text-secondary"
            >
              <FileText className="w-3 h-3 shrink-0 text-accent" />
              <span className="truncate">{d.name}</span>
              <button
                type="button"
                onClick={() => aiDocs.remove(d.id)}
                aria-label={t('study.ai.removeDoc', 'Quitar documento')}
                className="shrink-0 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {armed && showReturnNudge && body.trim() !== '' && (
        <button
          type="button"
          onClick={() => { disarm(); textareaRef.current?.focus() }}
          className="mb-2 w-full flex items-center justify-center gap-1.5 rounded-lg bg-bg-tertiary/70 hover:bg-bg-tertiary px-2 py-1.5 text-2xs text-text-secondary transition-colors"
        >
          {t('study.chat.returnNudge', '¿Volver al estudio? Sigues escribiéndole a Tulia.')}
        </button>
      )}

      {armed && (
        <div className="flex items-center gap-1.5 pb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/30 pl-2 pr-1 py-0.5 text-2xs font-medium text-accent">
            <Sparkles className="w-3 h-3" />
            {t('study.chat.tuliaMode', 'Modo Tulia')}
            <button
              type="button"
              onClick={() => { disarm(); textareaRef.current?.focus() }}
              aria-label={t('study.chat.exitTulia', 'Salir del modo Tulia (Esc)')}
              title={t('study.chat.exitTulia', 'Salir del modo Tulia (Esc)')}
              className="ml-0.5 flex items-center justify-center w-4 h-4 rounded-full hover:bg-accent/20 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      <div className="flex items-end gap-2">
        {canAttach && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={onPickFile}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={extracting}
              aria-label={t('study.ai.attachPdf', 'Adjuntar un PDF como contexto para Tulia')}
              title={t('study.ai.attachPdf', 'Adjuntar un PDF como contexto para Tulia')}
              className={cn(
                'shrink-0 h-9 w-9 md:h-8 md:w-8 rounded-md flex items-center justify-center transition-colors',
                'text-text-muted hover:text-text-primary hover:bg-bg-tertiary',
                extracting && 'opacity-40 cursor-not-allowed animate-pulse',
              )}
            >
              <Paperclip className="w-4 h-4" />
            </button>
          </>
        )}
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={armed ? t('study.chat.toTulia', 'Pregúntale a Tulia…') : t('chat.messagePlaceholder')}
          className={cn(
            'flex-1 resize-none bg-bg-tertiary md:bg-bg-secondary rounded-2xl md:rounded-md border border-border-subtle focus:border-border-hover',
            'text-[15px] md:text-sm text-text-primary placeholder:text-text-muted',
            'px-4 md:px-3 py-2.5 md:py-2 outline-none',
            'max-h-40',
            armed && 'border-accent/60 focus:border-accent bg-accent/5 md:bg-accent/5',
          )}
        />
        {/* Mobile: circular send button, only when there's text. In Modo Tulia
            it shows the Sparkles glyph so the target audience is unmistakable. */}
        <button
          type="button"
          onClick={submit}
          disabled={sendDisabled}
          aria-label={armed ? t('study.chat.sendToTulia', 'Enviar a Tulia') : t('chat.send')}
          className={cn(
            'md:hidden shrink-0 h-11 w-11 rounded-full flex items-center justify-center transition-all duration-150',
            hasText
              ? 'bg-accent text-bg-primary hover:brightness-110 scale-100 opacity-100'
              : 'bg-bg-tertiary text-text-muted scale-90 opacity-0 pointer-events-none',
          )}
        >
          {armed ? (
            <Sparkles className="w-5 h-5" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M5 12l7-7 7 7M12 5v14" />
            </svg>
          )}
        </button>
        {/* Desktop: labelled button — relabels to "Enviar a Tulia" when armed. */}
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
          {armed ? (
            <Sparkles className="w-3.5 h-3.5" />
          ) : (
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3.5 h-3.5">
              <path d="M2 8l11-5-3 11-3-4-5-2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {armed ? t('study.chat.sendToTulia', 'Enviar a Tulia') : t('chat.send')}
        </button>
      </div>
    </div>
  )
}
