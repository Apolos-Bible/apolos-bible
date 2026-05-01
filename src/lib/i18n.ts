import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en.json'
import es from '@/locales/es.json'
import { getBrowserLocale, getStoredAppLocale, selectDefaultAppLocale } from '@/lib/defaultAppLocale'

const locale = getStoredAppLocale() ?? selectDefaultAppLocale(getBrowserLocale())

i18n.use(initReactI18next).init({
  lng: locale,
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  interpolation: { escapeValue: false },
})

export default i18n
