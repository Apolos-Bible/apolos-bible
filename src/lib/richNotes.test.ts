import { describe, expect, it } from 'vitest'
import {
  RICH_NOTE_MARKER,
  editorHtmlFromNote,
  noteHtml,
  noteToPlainText,
  richNoteHasContent,
  serializeRichNote,
} from './richNotes'

describe('rich notes', () => {
  it('keeps old plain-text notes compatible with the editor', () => {
    expect(editorHtmlFromNote('Primera línea\nSegunda línea')).toBe('<p>Primera línea<br>Segunda línea</p>')
    expect(noteToPlainText('Primera línea\nSegunda línea')).toBe('Primera línea\nSegunda línea')
  })

  it('sanitizes dangerous markup before storing and rendering it', () => {
    const body = serializeRichNote('<p>Hola <strong>mundo</strong></p><img src=x onerror=alert(1)><script>alert(1)</script>')
    expect(body.startsWith(RICH_NOTE_MARKER)).toBe(true)
    expect(noteHtml(body)).toBe('<p>Hola <strong>mundo</strong></p>')
    expect(body).not.toContain('script')
    expect(body).not.toContain('onerror')
  })

  it('produces clean text for cards and search', () => {
    const body = serializeRichNote('<h2>Romanos 8</h2><p>Nada nos separa.</p><ul><li>Esperanza</li></ul>')
    expect(noteToPlainText(body)).toBe('Romanos 8\nNada nos separa.\nEsperanza')
  })

  it('does not consider an empty formatted document content', () => {
    expect(richNoteHasContent('<p><br></p>')).toBe(false)
    expect(richNoteHasContent('<p><strong>Fe</strong></p>')).toBe(true)
  })
})
