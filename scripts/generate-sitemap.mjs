import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SITE_LOCALES, localizedBiblePath, pickSeoVersion } from './seo-config.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv(filepath) {
  const content = readFileSync(filepath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    const key = trimmed.slice(0, separator)
    if (!process.env[key]) process.env[key] = trimmed.slice(separator + 1)
  }
}

loadEnv(resolve(ROOT, '.env.production'))

const API_BASE = `${process.env.VITE_API_URL}/api`
const SITE_BASE = process.env.VITE_SITE_URL || process.env.VITE_API_URL
const OUT_PATH = resolve(ROOT, 'public', 'sitemap.xml')

async function fetchJson(url, label) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${label} returned ${response.status}`)
  return response.json()
}

function sitemapXml(catalogs) {
  const urls = [{ loc: `${SITE_BASE}/`, priority: '1.0', changefreq: 'daily' }]
  for (const [lang, books] of catalogs) {
    for (const book of books) {
      urls.push({
        loc: `${SITE_BASE}${localizedBiblePath(lang, book.slug)}`,
        lang,
        bookNumber: book.number,
        priority: '0.9',
        changefreq: 'monthly',
      })
      for (let chapter = 1; chapter <= book.chapters_count; chapter++) {
        urls.push({
          loc: `${SITE_BASE}${localizedBiblePath(lang, book.slug, chapter)}`,
          lang,
          bookNumber: book.number,
          chapter,
          priority: '0.8',
          changefreq: 'monthly',
        })
      }
    }
  }

  const unique = new Map(urls.map((url) => [url.loc, url]))
  if (unique.size !== urls.length) throw new Error('The generated sitemap contains duplicate URLs')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[...unique.values()].map((url) => {
    const alternates = url.bookNumber ? SITE_LOCALES.flatMap((alternateLang) => {
      const book = catalogs.get(alternateLang)?.find((candidate) => candidate.number === url.bookNumber)
      if (!book || (url.chapter && url.chapter > book.chapters_count)) return []
      return [{ lang: alternateLang, loc: `${SITE_BASE}${localizedBiblePath(alternateLang, book.slug, url.chapter)}` }]
    }) : []
    const alternateXml = alternates.length < 2 ? '' : `\n${alternates.map((item) => `    <xhtml:link rel="alternate" hreflang="${item.lang}" href="${item.loc}" />`).join('\n')}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${alternates.find((item) => item.lang === 'en').loc}" />`
    return `  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
${alternateXml}\n  </url>`
  }).join('\n')}
</urlset>
`
}

async function main() {
  const versions = await fetchJson(`${API_BASE}/versions`, 'Versions API')
  const catalogs = new Map()

  for (const lang of SITE_LOCALES) {
    const version = pickSeoVersion(versions, lang)
    if (!version) throw new Error(`No published Bible version is available for ${lang}`)
    const candidates = [version, ...versions.filter((candidate) => candidate.language === lang && candidate.id !== version.id)]
    const byNumber = new Map()
    for (const candidate of candidates) {
      const candidateBooks = await fetchJson(
        `${API_BASE}/versions/${candidate.id}/books`,
        `Books API for ${candidate.abbreviation}`,
      )
      for (const book of candidateBooks) {
        if (book.number >= 1 && book.number <= 66 && !byNumber.has(book.number)) {
          byNumber.set(book.number, book)
        }
      }
      if (byNumber.size >= 66) break
    }
    const books = [...byNumber.values()].sort((a, b) => a.number - b.number)
    if (!Array.isArray(books) || books.length === 0) {
      throw new Error(`The ${lang} Bible catalog is empty`)
    }
    catalogs.set(lang, books)
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(OUT_PATH, sitemapXml(catalogs), 'utf-8')
  const total = [...catalogs.values()].reduce(
    (sum, books) => sum + books.length + books.reduce((n, book) => n + book.chapters_count, 0),
    1,
  )
  console.log(`Sitemap written: ${OUT_PATH} (${total} URLs; ${SITE_LOCALES.join(', ')})`)
}

main().catch((error) => {
  console.error('Failed to generate sitemap:', error.message)
  process.exit(1)
})
