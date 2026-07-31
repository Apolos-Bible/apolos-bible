export type Testament = 'old' | 'new'

export type Book = {
  id: string
  name: string
  testament: Testament
  chapters: number
}

export type Verse = {
  id: string
  book: string
  chapter: number
  verse: number
  text: string
}

export type HighlightColor = 'yellow' | 'blue' | 'green'

export type Highlight = {
  id: number
  user_id: number
  verse_id: number
  start_index: number
  end_index: number
  color: HighlightColor
}

export type Note = {
  id: string
  user_id: string
  verse_id: string
  content: string
  created_at: string
  user?: { email: string }
}

export type User = {
  id: string
  name: string
  email: string
}

export type PresenceUser = {
  id: number
  name: string
  color: string
  avatar_url?: string | null
}

export type Friend = {
  id: number
  name: string
  email: string
  avatar_url?: string | null
}

// ── Profile page ──────────────────────────────────────────────────────────

export type ProfileMode = 'self' | 'other'

export type FriendshipStatus =
  | 'self'
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'accepted'
  | 'blocked_by_them'

export type ProfileUser = {
  id: number
  name: string
  email: string | null
  avatar_url?: string | null
  bio?: string | null
  // self-only
  email_verified?: boolean
  content_public_default?: boolean
}

export type ProfileStats = {
  notes_count: number
  highlights_count: number
  friends_count: number
  studies_count: number
  reading_streak_days: number
}

export type ProfileLastReading = {
  book_name: string
  book_slug?: string | null
  chapter: number
  verse: number
  version?: string
  timestamp?: string
} | null

export type ProfileVerseRef = {
  verse_ref: string
  book_slug: string | null
  chapter: number | null
  verse: number | null
}

export type ProfileHighlight = ProfileVerseRef & {
  id: number
  text: string
  color: HighlightColor
  is_public: boolean
  created_at: string | null
}

export type ProfileNote = ProfileVerseRef & {
  id: number
  body: string
  note_type: string | null
  is_public: boolean
  created_at: string | null
}

export type ProfileStudy = {
  id: string
  title: string
  status: string
  thumbnail_url: string | null
  participants_count: number
  updated_at: string | null
}

export type ProfileData = {
  user: ProfileUser
  is_self: boolean
  friendship_status: FriendshipStatus
  friendship_id: number | null
  last_reading: ProfileLastReading
  stats: ProfileStats
  public_highlights: ProfileHighlight[]
  public_notes: ProfileNote[]
  friends: Friend[]
  studies: ProfileStudy[]
  recent_likes: Array<ProfileVerseRef & { id: number; note_body: string; created_at: string | null }> | null
}

export type FriendRequest = {
  id: number
  user_id: number
  friend_id: number
  status: 'pending' | 'accepted'
  user?: Friend
  friend?: Friend
  created_at: string
}

export type AppNotification = {
  id: string
  type: string
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
}
