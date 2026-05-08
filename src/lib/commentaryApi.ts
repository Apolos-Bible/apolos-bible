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
