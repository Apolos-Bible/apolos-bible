import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bold,
  Check,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Save,
  Strikethrough,
  Underline,
  Undo2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  editorHtmlFromNote,
  noteToPlainText,
  richNoteHasContent,
  serializeRichNote,
} from '@/lib/richNotes'

interface NoteEditorProps {
  initialValue: string
  onSave: (content: string) => void | Promise<void>
  onCancel: () => void
  variant?: 'inline' | 'document'
  documentContext?: React.ReactNode
  onDirtyChange?: (dirty: boolean) => void
  externalDirty?: boolean
}

type Command = 'bold' | 'italic' | 'underline' | 'strikeThrough'

export default function NoteEditor({ initialValue, onSave, onCancel, variant = 'inline', documentContext, onDirtyChange, externalDirty = false }: NoteEditorProps) {
  const { t } = useTranslation()
  const editorRef = useRef<HTMLDivElement>(null)
  const selectionRef = useRef<Range | null>(null)
  const initialHtml = useMemo(() => editorHtmlFromNote(initialValue), [initialValue])
  const initialSerialized = useMemo(() => serializeRichNote(initialHtml), [initialHtml])
  const [draftHtml, setDraftHtml] = useState(initialHtml)
  const [saving, setSaving] = useState(false)
  const [keyboardFocused, setKeyboardFocused] = useState(false)
  const inputModalityRef = useRef<'navigation' | 'other'>('other')
  const [active, setActive] = useState<Record<Command, boolean>>({ bold: false, italic: false, underline: false, strikeThrough: false })
  const hasContent = richNoteHasContent(draftHtml)
  const dirty = serializeRichNote(draftHtml) !== initialSerialized || externalDirty
  const canSave = hasContent && dirty && !saving
  const plainText = noteToPlainText(serializeRichNote(draftHtml))
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.innerHTML = initialHtml
    editor.focus()
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    selection?.removeAllRanges()
    selection?.addRange(range)
    selectionRef.current = range.cloneRange()
  }, [initialHtml])

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange])

  useEffect(() => {
    const useKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Tab') inputModalityRef.current = 'navigation'
    }
    const usePointer = () => {
      inputModalityRef.current = 'other'
      setKeyboardFocused(false)
    }

    window.addEventListener('keydown', useKeyboard, true)
    window.addEventListener('pointerdown', usePointer, true)
    return () => {
      window.removeEventListener('keydown', useKeyboard, true)
      window.removeEventListener('pointerdown', usePointer, true)
    }
  }, [])

  const rememberSelection = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection?.rangeCount) return
    const range = selection.getRangeAt(0)
    if (editor.contains(range.commonAncestorContainer)) selectionRef.current = range.cloneRange()
  }

  const restoreSelection = () => {
    const selection = window.getSelection()
    if (!selectionRef.current || !selection) return
    selection.removeAllRanges()
    selection.addRange(selectionRef.current)
  }

  const syncDraft = () => {
    const html = editorRef.current?.innerHTML ?? ''
    setDraftHtml(html)
    rememberSelection()
    setActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
    })
  }

  const runCommand = (command: string, value?: string) => {
    editorRef.current?.focus()
    restoreSelection()
    document.execCommand(command, false, value)
    syncDraft()
  }

  const addLink = () => {
    const url = window.prompt(t('notes.editor.linkPrompt'))?.trim()
    if (!url) return
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`
    runCommand('createLink', normalized)
  }

  const cancel = () => {
    if (dirty && !window.confirm(t('notes.editor.discardConfirm'))) return
    onCancel()
  }

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave(serializeRichNote(draftHtml))
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') {
      inputModalityRef.current = 'other'
      setKeyboardFocused(false)
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      void save()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }

  const toolbar = (
    <div className={cn('note-editor-toolbar flex items-center gap-1 overflow-x-auto border-b border-border-subtle bg-bg-secondary/95 px-2 py-2', variant === 'document' && 'sticky top-0 z-20 px-3 md:px-5')}>
      <select
        aria-label={t('notes.editor.textStyle')}
        defaultValue="p"
        onMouseDown={rememberSelection}
        onChange={(event) => runCommand('formatBlock', event.target.value)}
        className="h-8 shrink-0 rounded-lg border border-border-subtle bg-bg-primary px-2 text-xs font-medium text-text-secondary outline-none hover:border-border-strong focus-visible:border-accent"
      >
        <option value="p">{t('notes.editor.normal')}</option>
        <option value="h1">{t('notes.editor.title')}</option>
        <option value="h2">{t('notes.editor.heading')}</option>
        <option value="h3">{t('notes.editor.subheading')}</option>
      </select>
      <ToolbarDivider />
      <ToolbarButton label={t('notes.editor.bold')} active={active.bold} onPress={() => runCommand('bold')}><Bold /></ToolbarButton>
      <ToolbarButton label={t('notes.editor.italic')} active={active.italic} onPress={() => runCommand('italic')}><Italic /></ToolbarButton>
      <ToolbarButton label={t('notes.editor.underline')} active={active.underline} onPress={() => runCommand('underline')}><Underline /></ToolbarButton>
      <ToolbarButton label={t('notes.editor.strike')} active={active.strikeThrough} onPress={() => runCommand('strikeThrough')}><Strikethrough /></ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton label={t('notes.editor.bullets')} onPress={() => runCommand('insertUnorderedList')}><List /></ToolbarButton>
      <ToolbarButton label={t('notes.editor.numbered')} onPress={() => runCommand('insertOrderedList')}><ListOrdered /></ToolbarButton>
      <ToolbarButton label={t('notes.editor.quote')} onPress={() => runCommand('formatBlock', 'blockquote')}><Quote /></ToolbarButton>
      <ToolbarButton label={t('notes.editor.link')} onPress={addLink}><Link /></ToolbarButton>
      <ToolbarButton label={t('notes.editor.separator')} onPress={() => runCommand('insertHorizontalRule')}><Minus /></ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton label={t('notes.editor.undo')} onPress={() => runCommand('undo')}><Undo2 /></ToolbarButton>
      <ToolbarButton label={t('notes.editor.redo')} onPress={() => runCommand('redo')}><Redo2 /></ToolbarButton>
      <ToolbarButton label={t('notes.editor.clearFormat')} onPress={() => runCommand('removeFormat')}><RemoveFormatting /></ToolbarButton>
    </div>
  )

  if (variant === 'document') {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {toolbar}
        <div className="flex-1 overflow-y-auto bg-bg-tertiary/70 px-3 py-5 md:px-8 md:py-8">
          <div className="note-document-page mx-auto min-h-[65vh] w-full max-w-[780px] rounded-sm border border-border-subtle bg-bg-secondary px-6 py-8 shadow-2xl shadow-black/15 md:min-h-[840px] md:px-16 md:py-14">
            {documentContext}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label={t('notes.editorPlaceholder')}
              data-placeholder={t('notes.editor.documentPlaceholder')}
              data-keyboard-focus={keyboardFocused ? 'true' : 'false'}
              onInput={syncDraft}
              onFocus={() => setKeyboardFocused(inputModalityRef.current === 'navigation')}
              onBlur={() => setKeyboardFocused(false)}
              onKeyUp={rememberSelection}
              onMouseUp={rememberSelection}
              onKeyDown={handleKeyDown}
              className="note-rich-editor min-h-[680px] font-reading text-[17px] leading-[1.85] text-text-primary outline-none"
            />
          </div>
        </div>
        <footer className="flex shrink-0 items-center gap-3 border-t border-border-subtle bg-bg-secondary px-4 py-3 md:px-6">
          <span className="hidden text-2xs text-text-muted sm:block">{t('notes.editor.words', { count: wordCount })}</span>
          <span className="hidden text-2xs text-text-muted sm:block">{t('notes.editor.saveShortcut')}</span>
          <div className="flex-1" />
          <button type="button" onClick={cancel} className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"><X className="h-4 w-4" />{t('notes.cancel')}</button>
          <button type="button" onClick={() => void save()} disabled={!canSave} className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-xs font-bold text-bg-primary shadow-lg shadow-accent/15 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">{saving ? <Check className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}{saving ? t('notes.saving') : t('notes.save')}</button>
        </footer>
      </div>
    )
  }

  return (
    <div className={cn('note-editor-surface overflow-hidden rounded-xl border border-border-subtle bg-bg-primary shadow-sm', keyboardFocused && 'border-accent')}>
      {toolbar}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={t('notes.editorPlaceholder')}
        data-placeholder={t('notes.editorPlaceholder')}
        data-keyboard-focus={keyboardFocused ? 'true' : 'false'}
        onInput={syncDraft}
        onFocus={() => setKeyboardFocused(inputModalityRef.current === 'navigation')}
        onBlur={() => setKeyboardFocused(false)}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
        onKeyDown={handleKeyDown}
        className="note-rich-editor min-h-32 px-4 py-3 text-sm leading-relaxed text-text-primary outline-none"
      />
      <div className="flex items-center gap-2 border-t border-border-subtle px-3 py-2">
        <span className="text-2xs text-text-muted">{t('notes.editor.words', { count: wordCount })}</span>
        <div className="flex-1" />
        <button type="button" onClick={cancel} className="rounded-lg px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-tertiary">{t('notes.cancel')}</button>
        <button type="button" onClick={() => void save()} disabled={!canSave} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg-primary disabled:cursor-not-allowed disabled:opacity-40">{saving ? t('notes.saving') : t('notes.save')}</button>
      </div>
    </div>
  )
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-border-subtle" aria-hidden="true" />
}

function ToolbarButton({ label, active = false, onPress, children }: { label: string; active?: boolean; onPress: () => void; children: React.ReactElement<{ className?: string }> }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onPress}
      className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary', active && 'bg-accent/15 text-accent')}
    >
      <span className="[&>svg]:h-4 [&>svg]:w-4">{children}</span>
    </button>
  )
}
