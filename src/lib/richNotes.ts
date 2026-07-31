export const RICH_NOTE_MARKER = '<!--apolos-rich-note-->'

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a', 'hr',
])

const DROP_WITH_CONTENT = new Set(['script', 'style', 'svg', 'math', 'template', 'iframe', 'object', 'embed'])

export function isRichNote(body: string): boolean {
  return body.startsWith(RICH_NOTE_MARKER)
}

export function sanitizeNoteHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return escapeHtml(html)
  const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const body = parsed.body
  return Array.from(body.childNodes).map(sanitizeNode).join('').trim()
}

export function editorHtmlFromNote(body: string): string {
  if (isRichNote(body)) return sanitizeNoteHtml(body.slice(RICH_NOTE_MARKER.length))

  const escaped = escapeHtml(body)
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>') || '<br>'}</p>`)
    .join('')
}

export function serializeRichNote(html: string): string {
  return `${RICH_NOTE_MARKER}${sanitizeNoteHtml(html)}`
}

export function noteHtml(body: string): string | null {
  return isRichNote(body) ? sanitizeNoteHtml(body.slice(RICH_NOTE_MARKER.length)) : null
}

export function noteToPlainText(body: string): string {
  if (!isRichNote(body)) return body
  const html = sanitizeNoteHtml(body.slice(RICH_NOTE_MARKER.length))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h1|h2|h3|li|blockquote)>/gi, '</$1>\n')

  if (typeof document !== 'undefined') {
    const element = document.createElement('div')
    element.innerHTML = html
    return (element.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim()
  }

  return html.replace(/<[^>]+>/g, '').trim()
}

export function richNoteHasContent(html: string): boolean {
  return noteToPlainText(serializeRichNote(html)).trim().length > 0
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function sanitizeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? '')
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const element = node as Element
  const tag = element.tagName.toLowerCase()
  if (DROP_WITH_CONTENT.has(tag)) return ''
  const children = Array.from(element.childNodes).map(sanitizeNode).join('')
  if (!ALLOWED_TAGS.has(tag)) return children
  if (tag === 'br' || tag === 'hr') return `<${tag}>`

  let attributes = ''
  if (tag === 'a') {
    const href = safeHref(element.getAttribute('href'))
    const title = element.getAttribute('title')?.trim()
    if (href) attributes += ` href="${escapeHtml(href)}"`
    if (title) attributes += ` title="${escapeHtml(title)}"`
  }

  return `<${tag}${attributes}>${children}</${tag}>`
}

function safeHref(value: string | null): string | null {
  const href = value?.trim()
  if (!href) return null
  if (href.startsWith('/') || href.startsWith('#')) return href
  try {
    const url = new URL(href)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? href : null
  } catch {
    return null
  }
}
