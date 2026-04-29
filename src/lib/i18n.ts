import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en.json'
import es from '@/locales/es.json'

const savedLocale = localStorage.getItem('locale')
const osLocale   = navigator.language.startsWith('es') ? 'es' : 'en'

i18n.use(initReactI18next).init({
  lng: savedLocale ?? osLocale,
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  interpolation: { escapeValue: false },
})

export default i18n
