import i18n from '@/lib/i18n'
import { BIBLE_VERSION_STORAGE_KEY } from '@/lib/defaultBibleVersion'
import { APP_LOCALE_STORAGE_KEY } from '@/lib/defaultAppLocale'
import { useUIStore } from '@/lib/store/useUIStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { fetchUserSettings, saveUserSettings, type UserSettings } from '@/lib/userSettingsApi'

export { fetchUserSettings }

export function collectClientSettings(): UserSettings {
  const ui = useUIStore.getState()
  const verse = useVerseStore.getState()

  return {
    preferred_bible_version_id: verse.versionId,
    locale: ui.locale,
    theme: ui.theme,
    font_size: ui.fontSize,
    reading_mode: ui.readingMode,
  }
}

export async function persistClientSettings(): Promise<void> {
  await saveUserSettings(collectClientSettings())
}

export async function applyUserSettings(settings: UserSettings): Promise<void> {
  const ui = useUIStore.getState()
  const verse = useVerseStore.getState()

  if (settings.theme) {
    localStorage.setItem('theme', settings.theme)
    document.documentElement.setAttribute('data-theme', settings.theme)
    useUIStore.setState({ theme: settings.theme })
  }

  if (settings.locale) {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, settings.locale)
    await i18n.changeLanguage(settings.locale)
    useUIStore.setState({ locale: settings.locale })
  }

  if (settings.font_size) {
    localStorage.setItem('fontSize', settings.font_size)
    useUIStore.setState({ fontSize: settings.font_size })
  }

  if (settings.reading_mode) {
    localStorage.setItem('readingMode', settings.reading_mode)
    useUIStore.setState({ readingMode: settings.reading_mode })
  }

  if (settings.preferred_bible_version_id && settings.preferred_bible_version_id !== verse.versionId) {
    localStorage.setItem(BIBLE_VERSION_STORAGE_KEY, String(settings.preferred_bible_version_id))
    await verse.setVersion(settings.preferred_bible_version_id, { sync: false })
  }

  useUIStore.setState({
    theme: settings.theme ?? ui.theme,
    locale: settings.locale ?? ui.locale,
    fontSize: settings.font_size ?? ui.fontSize,
    readingMode: settings.reading_mode ?? ui.readingMode,
  })
}
