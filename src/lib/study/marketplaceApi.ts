import { api } from '@/lib/api'
import type { PathStudySummary, PathVisibility } from '@/lib/study/guidedEditorApi'

export type MarketplaceSort = 'recent' | 'rating' | 'added'

/** A study path as the marketplace lists it. */
export interface StudyPathCard {
  slug: string
  title: string
  description: string | null
  visibility: PathVisibility
  is_mine: boolean
  author: { id: number; name: string | null } | null
  study_count: number
  rating_avg: number
  rating_count: number
  list_count: number
  /** What I voted, or null if I haven't. */
  my_rating: number | null
  in_my_list: boolean
  created_at: string | null
}

export interface StudyPathDetail extends StudyPathCard {
  studies: PathStudySummary[]
}

export interface RatingState {
  rating_avg: number
  rating_count: number
  my_rating: number | null
}

export interface ListState {
  in_my_list: boolean
  list_count: number
}

export const marketplaceApi = {
  browse: (params: { sort?: MarketplaceSort; q?: string; cursor?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.sort) query.set('sort', params.sort)
    if (params.q) query.set('q', params.q)
    if (params.cursor) query.set('cursor', params.cursor)
    const suffix = query.toString() ? `?${query}` : ''

    return api.get<{ paths: StudyPathCard[]; next_cursor: string | null }>(
      `/api/marketplace/paths${suffix}`,
    )
  },

  /** The ten paths on the front page, best first. */
  featured: () => api.get<StudyPathCard[]>('/api/marketplace/featured'),

  path: (slug: string) => api.get<StudyPathDetail>(`/api/marketplace/paths/${slug}`),

  myList: () => api.get<StudyPathCard[]>('/api/my/study-list'),

  rate: (slug: string, stars: number) =>
    api.put<RatingState>(`/api/guided-plans/${slug}/rating`, { stars }),

  unrate: (slug: string) => api.delete<RatingState>(`/api/guided-plans/${slug}/rating`),

  addToList: (slug: string) => api.post<ListState>(`/api/guided-plans/${slug}/list`, {}),

  removeFromList: (slug: string) => api.delete<ListState>(`/api/guided-plans/${slug}/list`),
}
