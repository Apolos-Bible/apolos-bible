import i18n from '@/lib/i18n'
import { BIBLE_VERSION_STORAGE_KEY } from '@/lib/defaultBibleVersion'
import { APP_LOCALE_STORAGE_KEY } from '@/lib/defaultAppLocale'
import { fromYouVersionClientId, toYouVersionClientId } from '@/lib/youVersion'
import { useUIStore } from '@/lib/store/useUIStore'
import {
  setBibleVersionForAllStores,
  useVerseStore,
} from '@/lib/store/useVerseStore'
import { fetchUserSettings, saveUserSettings, type UserSettings } from '@/lib/userSettingsApi'

export { fetchUserSettings }

export function collectClientSettings(): UserSettings {
  const ui = useUIStore.getState()
  const verse = useVerseStore.getState()

  const youVersionId = fromYouVersionClientId(verse.versionId)
  return {
    preferred_bible_version_id: youVersionId === null ? verse.versionId : null,
    preferred_bible_provider: youVersionId === null ? 'local' : 'youversion',
    preferred_bible_provider_id: youVersionId ?? verse.versionId,
    locale: ui.locale,
    theme: ui.theme,
    accent_color: ui.accentColor,
    font_size: ui.fontSize,
    reading_mode: ui.readingMode,
    reader_font: ui.readerFont,
    line_height: ui.lineHeight,
    show_verse_numbers: ui.showVerseNumbers,
    reduce_motion: ui.reduceMotion,
    high_contrast: ui.highContrast,
  }
}

export async function persistClientSettings(): Promise<void> {
  await saveUserSettings(collectClientSettings())
}

export async function applyUserSettings(settings: UserSettings): Promise<void> {
  const ui = useUIStore.getState()
  const verse = useVerseStore.getState()

  if (settings.preferred_compare_version_id) {
    localStorage.setItem('preferredCompareVersionId', String(settings.preferred_compare_version_id))
  } else {
    localStorage.removeItem('preferredCompareVersionId')
  }
  if (settings.preferred_ai_model) localStorage.setItem('preferredAiModel', settings.preferred_ai_model)
  else localStorage.removeItem('preferredAiModel')

  if (settings.theme) {
    localStorage.setItem('theme', settings.theme)
    ui.setTheme(settings.theme, false)
  }

  if (settings.accent_color) ui.setAccentColor(settings.accent_color, false)

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

  if (settings.reader_font) ui.setReaderFont(settings.reader_font, false)
  if (settings.line_height) ui.setLineHeight(settings.line_height, false)
  if (typeof settings.show_verse_numbers === 'boolean') ui.setShowVerseNumbers(settings.show_verse_numbers, false)
  if (typeof settings.reduce_motion === 'boolean') ui.setReduceMotion(settings.reduce_motion, false)
  if (typeof settings.high_contrast === 'boolean') ui.setHighContrast(settings.high_contrast, false)

  if (typeof settings.tutorial_completed === 'boolean') {
    if (settings.tutorial_completed) {
      localStorage.setItem('tutorial_completed_v1', 'true')
      localStorage.setItem('tutorial_invite_dismissed_v1', 'true')
    } else {
      localStorage.removeItem('tutorial_completed_v1')
    }
  }

  const preferredVersionId = settings.preferred_bible_provider === 'youversion'
    && settings.preferred_bible_provider_id
    ? toYouVersionClientId(settings.preferred_bible_provider_id)
    : settings.preferred_bible_provider_id ?? settings.preferred_bible_version_id
  if (preferredVersionId && preferredVersionId !== verse.versionId) {
    localStorage.setItem(BIBLE_VERSION_STORAGE_KEY, String(preferredVersionId))
    await setBibleVersionForAllStores(preferredVersionId, { sync: false })
  }

  useUIStore.setState({
    theme: settings.theme ?? ui.theme,
    locale: settings.locale ?? ui.locale,
    fontSize: settings.font_size ?? ui.fontSize,
    readingMode: settings.reading_mode ?? ui.readingMode,
    accentColor: settings.accent_color ?? ui.accentColor,
    readerFont: settings.reader_font ?? ui.readerFont,
    lineHeight: settings.line_height ?? ui.lineHeight,
    showVerseNumbers: settings.show_verse_numbers ?? ui.showVerseNumbers,
    reduceMotion: settings.reduce_motion ?? ui.reduceMotion,
    highContrast: settings.high_contrast ?? ui.highContrast,
  })
}
