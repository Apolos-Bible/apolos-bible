import { api } from '@/lib/api'
import type { FontSize, Locale, ReadingMode, Theme } from '@/lib/store/useUIStore'

export interface UserSettings {
  preferred_bible_version_id: number | null
  locale: Locale | null
  theme: Theme | null
  font_size: FontSize | null
  reading_mode: ReadingMode | null
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
