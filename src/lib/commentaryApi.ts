import { api } from './api'

export interface Commentary {
  id: number
  ew_slug: string
  chapter: number
  content: string
  scraped_at: string
  locale: 'en' | 'es'
}

export const commentaryApi = {
  get: (bookSlug: string, chapter: number, locale: string) => {
    const lang = locale.startsWith('es') ? 'es' : 'en'
    return api.get<Commentary>(`/api/commentary/${bookSlug}/${chapter}?locale=${lang}`)
  },
}

export function commentaryExcerpt(html: string, sentenceCount = 3): string {
  const spacedHtml = html.replace(/<\/(?:p|div|h[1-6]|li|blockquote)>/gi, '$& ')
  const document = new DOMParser().parseFromString(spacedHtml, 'text/html')
  document.querySelectorAll('h1, h2, h3, h4, h5, h6, script, style, button').forEach((element) => element.remove())
  const text = (document.body.textContent ?? '').replace(/\s+/g, ' ').trim()
  const sentences = text.match(/[^.!?…]+(?:[.!?…]+|$)/g) ?? []
  return sentences.slice(0, sentenceCount).map((sentence) => sentence.trim()).join(' ')
}
