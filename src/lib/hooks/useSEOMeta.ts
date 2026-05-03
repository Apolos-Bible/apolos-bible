import { useVerseStore } from '@/lib/store/useVerseStore'

const BASE_URL = 'https://bible.tulia.study'
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
  breadcrumbs: { name: string; url: string }[]
  verseText: string | null
}

export function useSEOMeta(): SEOMetaData {
  const selectedBook = useVerseStore(s => s.selectedBook)
  const selectedChapter = useVerseStore(s => s.selectedChapter)
  const selectedVerseId = useVerseStore(s => s.selectedVerseId)
  const verses = useVerseStore(s => s.verses)
  const books = useVerseStore(s => s.books)

  const book = books.find(b => b.slug === selectedBook)
  const bookName = book?.name ?? selectedBook

  const verseParts = selectedVerseId?.split('-')
  const verseNumber = verseParts && verseParts.length >= 3 ? parseInt(verseParts[2]) : null
  const selectedVerse = verseNumber != null ? verses.find(v => v.verse === verseNumber) : null

  let title: string
  if (verseNumber) {
    title = `${bookName} ${selectedChapter}:${verseNumber} — Tulia Bible`
  } else {
    title = `${bookName} ${selectedChapter} — Tulia Bible`
  }

  let description: string
  if (selectedVerse?.text) {
    description = `${selectedVerse.text.slice(0, 155).trim()}`
  } else if (verses.length > 0 && verses[0]?.text) {
    description = `Read ${bookName} chapter ${selectedChapter}. ${verses[0].text.slice(0, 140).trim()}...`
  } else {
    description = `Read ${bookName} chapter ${selectedChapter} in Tulia Bible, the collaborative Bible study app with cross-references, highlights, notes, and real-time study sessions.`
  }

  let canonicalUrl: string
  if (verseNumber) {
    canonicalUrl = `${BASE_URL}/bible/${selectedBook}/${selectedChapter}/${verseNumber}`
  } else {
    canonicalUrl = `${BASE_URL}/bible/${selectedBook}/${selectedChapter}`
  }

  const breadcrumbs = [
    { name: 'Tulia Bible', url: BASE_URL },
    { name: bookName, url: `${BASE_URL}/bible/${selectedBook}` },
  ]
  if (verseNumber) {
    breadcrumbs.push({ name: `Chapter ${selectedChapter}`, url: `${BASE_URL}/bible/${selectedBook}/${selectedChapter}` })
    breadcrumbs.push({ name: `Verse ${verseNumber}`, url: canonicalUrl })
  } else {
    breadcrumbs.push({ name: `Chapter ${selectedChapter}`, url: canonicalUrl })
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
    breadcrumbs,
    verseText: selectedVerse?.text ?? null,
  }
}
