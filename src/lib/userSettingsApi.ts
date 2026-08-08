import { api } from '@/lib/api'
import type { FontSize, LineHeight, Locale, ReaderFont, ReadingMode, Theme } from '@/lib/store/useUIStore'

export interface UserSettings {
  preferred_bible_version_id: number | null
  preferred_bible_provider?: 'local' | 'youversion' | null
  preferred_bible_provider_id?: number | null
  preferred_compare_version_id?: number | null
  locale: Locale | null
  theme: Theme | null
  accent_color?: string | null
  font_size: FontSize | null
  reading_mode: ReadingMode | null
  reader_font?: ReaderFont | null
  line_height?: LineHeight | null
  show_verse_numbers?: boolean
  reduce_motion?: boolean
  high_contrast?: boolean
  discoverable_by_email?: boolean
  show_reading_activity?: boolean
  allow_friend_requests?: 'everyone' | 'friends_of_friends' | 'nobody'
  preferred_ai_model?: string | null
  tutorial_completed?: boolean
  content_public_default?: boolean
  notes_public_default?: boolean
  highlights_public_default?: boolean
}

export type UserSettingsUpdate = Partial<UserSettings>

const hasToken = () => Boolean(localStorage.getItem('verbum_token'))

export function fetchUserSettings(): Promise<UserSettings> {
  return api.get<UserSettings>('/api/user/settings')
}

export async function saveUserSettings(settings: UserSettingsUpdate): Promise<UserSettings | null> {
  if (!hasToken()) return null
  return api.patch<UserSettings>('/api/user/settings', settings)
}

export function saveUserSettingsSilently(settings: UserSettingsUpdate): void {
  void saveUserSettings(settings).catch((error) => {
    console.warn('Failed to save user settings', error)
  })
}
