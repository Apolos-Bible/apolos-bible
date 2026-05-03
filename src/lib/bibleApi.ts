import { api } from './api'

export interface ApiVersion {
  id: number
  name: string
  abbreviation: string
  language: string
}

export interface ApiBook {
  id: number
  number: number
  name: string
  slug: string
  chapters_count: number
}

export interface ApiVerse {
  id: number
  number: number
  text: string
}

export interface ApiChapterResponse {
  book: { number: number; name: string; slug: string }
  chapter: number
  chapter_id: number
  verses: ApiVerse[]
}

export interface ApiSearchResult {
  id: number
  book: string
  slug: string
  chapter: number
  verse: number
  text: string
  chapterGroup?: string
}

export interface ApiCrossRef {
  id: number
  book: string
  slug: string
  chapter: number
  verse: number
  text: string
}

export const bibleApi = {
  versions: ()                                          => api.get<ApiVersion[]>('/api/versions'),
  books: (versionId: number)                            => api.get<ApiBook[]>(`/api/versions/${versionId}/books`),
  chapter: (versionId: number, slug: string, n: number) => api.get<ApiChapterResponse>(`/api/versions/${versionId}/books/${slug}/chapters/${n}`),
  search: (versionId: number, q: string)                => api.get<ApiSearchResult[]>(`/api/versions/${versionId}/search?q=${encodeURIComponent(q)}`),
  crossRefs: (verseId: number)                          => api.get<ApiCrossRef[]>(`/api/verses/${verseId}/cross-references`),
  crossRefVerseIds: (chapterId: number)                 => api.get<number[]>(`/api/chapters/${chapterId}/cross-ref-verse-ids`),
}
