import { useVerseStore } from '@/lib/store/useVerseStore'
import { useUIStore } from '@/lib/store/useUIStore'

const BASE_URL = 'https://apolos.bible'
const OG_IMAGE = `${BASE_URL}/logo.png`

export interface SEOMetaData {
  title: string
  description: string
  canonicalUrl: string
  ogTitle: string
  ogDescription: string
  ogUrl: string
  ogImage: string
  twitterCard: 'summary'
  htmlLang: 'en' | 'es'
  ogLocale: 'en_US' | 'es_ES'
  breadcrumbs: { name: string; url: string }[]
  verseText: string | null
}

export function useSEOMeta(): SEOMetaData {
  const selectedBook = useVerseStore(s => s.selectedBook)
  const selectedChapter = useVerseStore(s => s.selectedChapter)
  const selectedVerseId = useVerseStore(s => s.selectedVerseId)
  const verses = useVerseStore(s => s.verses)
  const books = useVerseStore(s => s.books)
  const locale = useUIStore(s => s.locale)

  const book = books.find(b => b.slug === selectedBook)
  const bookName = book?.name ?? selectedBook

  const verseParts = selectedVerseId?.split('-')
  const verseNumber = verseParts && verseParts.length >= 3 ? parseInt(verseParts[2]) : null
  const selectedVerse = verseNumber != null ? verses.find(v => v.verse === verseNumber) : null

  let title: string
  if (verseNumber) {
    title = `${bookName} ${selectedChapter}:${verseNumber} — Apolos Bible`
  } else {
    title = `${bookName} ${selectedChapter} — Apolos Bible`
  }

  let description: string
  if (selectedVerse?.text) {
    description = `${selectedVerse.text.slice(0, 155).trim()}`
  } else if (verses.length > 0 && verses[0]?.text) {
    description = locale === 'es'
      ? `Lee ${bookName}, capítulo ${selectedChapter}. ${verses[0].text.slice(0, 140).trim()}...`
      : `Read ${bookName} chapter ${selectedChapter}. ${verses[0].text.slice(0, 140).trim()}...`
  } else {
    description = locale === 'es'
      ? `Lee ${bookName}, capítulo ${selectedChapter}, en Apolos.`
      : `Read ${bookName} chapter ${selectedChapter} in Apolos.`
  }

  const localizedBase = locale === 'es' ? `${BASE_URL}/es/bible` : `${BASE_URL}/bible`

  let canonicalUrl: string
  if (verseNumber) {
    canonicalUrl = `${localizedBase}/${selectedBook}/${selectedChapter}/${verseNumber}`
  } else {
    canonicalUrl = `${localizedBase}/${selectedBook}/${selectedChapter}`
  }

  const breadcrumbs = [
    { name: 'Apolos Bible', url: BASE_URL },
    { name: bookName, url: `${localizedBase}/${selectedBook}` },
  ]
  if (verseNumber) {
    breadcrumbs.push({ name: locale === 'es' ? `Capítulo ${selectedChapter}` : `Chapter ${selectedChapter}`, url: `${localizedBase}/${selectedBook}/${selectedChapter}` })
    breadcrumbs.push({ name: locale === 'es' ? `Versículo ${verseNumber}` : `Verse ${verseNumber}`, url: canonicalUrl })
  } else {
    breadcrumbs.push({ name: locale === 'es' ? `Capítulo ${selectedChapter}` : `Chapter ${selectedChapter}`, url: canonicalUrl })
  }

  return {
    title,
    description,
    canonicalUrl,
    ogTitle: title,
    ogDescription: description,
    ogUrl: canonicalUrl,
    ogImage: OG_IMAGE,
    twitterCard: 'summary',
    htmlLang: locale === 'es' ? 'es' : 'en',
    ogLocale: locale === 'es' ? 'es_ES' : 'en_US',
    breadcrumbs,
    verseText: selectedVerse?.text ?? null,
  }
}
