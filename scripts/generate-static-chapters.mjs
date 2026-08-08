import { writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LOCALE_CONFIG, SITE_LOCALES, localizedBiblePath, pickSeoVersion } from './seo-config.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

function loadEnv(filepath) {
  const content = readFileSync(filepath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    const val = trimmed.slice(eq + 1)
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnv(resolve(ROOT, '.env.production'))

const API_BASE = `${process.env.VITE_API_URL}/api`
const SITE_BASE = process.env.VITE_SITE_URL || process.env.VITE_API_URL
const CONCURRENCY = 8

const OUT_DIR = resolve(ROOT, 'out')

function chapterUrl(slug, n, lang) {
  return `${SITE_BASE}${localizedBiblePath(lang, slug, n)}`
}

function bookUrl(slug, lang) {
  return `${SITE_BASE}${localizedBiblePath(lang, slug)}`
}

function alternateLinks(alternates) {
  if (alternates.length < 2) return ''
  const links = alternates.map(({ lang, url }) => `    <link rel="alternate" hreflang="${lang}" href="${url}" />`).join('\n')
  const fallback = alternates.find((item) => item.lang === 'en') ?? alternates[0]
  return `${links}\n    <link rel="alternate" hreflang="x-default" href="${fallback.url}" />\n`
}

function seoHead(bookName, slug, chapter, firstVerseText, lang, alternates) {
  const locale = LOCALE_CONFIG[lang]
  const title = `${bookName} ${chapter} â€” Apolos Bible`
  const description = firstVerseText
    ? `${firstVerseText.slice(0, 155).trim()}`
    : `Read ${bookName} chapter ${chapter} in Apolos Bible, the collaborative Bible study app.`
  const canonical = chapterUrl(slug, chapter, lang)
  const breadcrumbs = [
    { '@type': 'ListItem', position: 1, name: 'Apolos Bible', item: SITE_BASE },
    { '@type': 'ListItem', position: 2, name: bookName, item: bookUrl(slug, lang) },
    { '@type': 'ListItem', position: 3, name: `${locale.chapter} ${chapter}`, item: canonical },
  ]

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'Apolos Bible', url: SITE_BASE },
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: breadcrumbs },
  })

  return `<!doctype html>
<html lang="${locale.htmlLang}" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonical}" />
${alternateLinks(alternates)}

    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${SITE_BASE}/logo.png" />
    <meta property="og:image:width" content="799" />
    <meta property="og:image:height" content="799" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Apolos Bible" />
    <meta property="og:locale" content="${locale.ogLocale}" />

    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${SITE_BASE}/logo.png" />

    <script type="application/ld+json">${jsonLd}</script>

    <style>
      :root { --bg: #1a1a2e; --bg-card: #222240; --text: #e0e0e0; --text-muted: #9090a0; --accent: #c8a96a; --accent-soft: #c8a96a22; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: var(--bg); color: var(--text); font-family: Georgia, 'Times New Roman', serif; line-height: 1.8; padding: 2rem 1rem; max-width: 720px; margin: 0 auto; }
      h1 { font-size: 1.6rem; font-weight: 400; text-align: center; margin-bottom: 0.3rem; color: var(--accent); }
      .chapter-label { text-align: center; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--accent); opacity: 0.7; margin-bottom: 2rem; }
      .verse { margin-bottom: 1.2rem; padding: 0.5rem 0; border-bottom: 1px solid var(--accent-soft); }
      .verse-num { font-size: 0.65rem; font-weight: 700; color: var(--accent); opacity: 0.6; margin-right: 0.5rem; vertical-align: super; font-family: system-ui, sans-serif; }
      .verse-text { font-size: 1.05rem; }
      .nav { display: flex; justify-content: space-between; margin: 2rem 0; padding: 1rem 0; border-top: 1px solid var(--accent-soft); }
      .nav a { color: var(--accent); text-decoration: none; font-family: system-ui, sans-serif; font-size: 0.85rem; }
      .nav a:hover { text-decoration: underline; }
      .footer { text-align: center; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--accent-soft); }
      .footer p { color: var(--text-muted); font-family: system-ui, sans-serif; font-size: 0.75rem; }
      .footer a { color: var(--accent); text-decoration: none; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(bookName)}</h1>
    <p class="chapter-label">${locale.chapter} ${chapter}</p>`
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function fetchAllVersions() {
  const res = await fetchWithRetry(`${API_BASE}/versions`)
  if (!res.ok) throw new Error(`Versions API returned ${res.status}`)
  return res.json()
}

async function fetchVersionDownload(versionId) {
  const res = await fetchWithRetry(`${API_BASE}/versions/${versionId}/download`)
  if (!res.ok) throw new Error(`Download API returned ${res.status} for version ${versionId}`)
  const payload = await res.json()
  if (!payload || !Array.isArray(payload.books)) {
    throw new Error(`Download API returned an invalid payload for version ${versionId}`)
  }
  return payload
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url)
      if (response.ok || response.status < 500) return response
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 250))
  }
  throw lastError
}

function generateChapterHtml(data, lang, alternates) {
  const { book, chapter, verses } = data
  const firstVerseText = verses.length > 0 ? verses[0].text : null
  let html = seoHead(book.name, book.slug, chapter, firstVerseText, lang, alternates)

  for (const v of verses) {
    html += `  <div class="verse"><span class="verse-num">${v.number}</span><span class="verse-text">${escapeHtml(v.text)}</span></div>\n`
  }

  html += `  <nav class="nav">\n    <span></span>\n    <span></span>\n  </nav>\n`
  html += `  <div class="footer">
    <p>Read <a href="${chapterUrl(book.slug, chapter, lang)}">${escapeHtml(book.name)} ${chapter}</a> interactively on <a href="${SITE_BASE}">Apolos Bible</a> â€” with highlights, notes, cross-references, and collaborative study.</p>
  </div>\n`
  html += `</body>\n</html>\n`
  return html
}

function generateBookHtml(book, lang, alternates) {
  const locale = LOCALE_CONFIG[lang]
  const title = `${book.name} â€” Apolos Bible`
  const description = lang === 'es'
    ? `Lee el libro de ${book.name} (${book.chapters_count} capÃ­tulos) en Apolos.`
    : `Read the book of ${book.name} (${book.chapters_count} chapters) in Apolos.`
  const canonical = bookUrl(book.slug, lang)

  let chapterLinks = ''
  for (let c = 1; c <= book.chapters_count; c++) {
    chapterLinks += `      <li><a href="${chapterUrl(book.slug, c, lang)}">${locale.chapter} ${c}</a></li>\n`
  }

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'Apolos Bible', url: SITE_BASE },
  })

  return `<!doctype html>
<html lang="${locale.htmlLang}" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonical}" />
${alternateLinks(alternates)}
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${SITE_BASE}/logo.png" />
    <meta property="og:image:width" content="799" />
    <meta property="og:image:height" content="799" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Apolos Bible" />
    <meta property="og:locale" content="${locale.ogLocale}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${SITE_BASE}/logo.png" />
    <script type="application/ld+json">${jsonLd}</script>
    <style>
      :root { --bg: #1a1a2e; --bg-card: #222240; --text: #e0e0e0; --text-muted: #9090a0; --accent: #c8a96a; --accent-soft: #c8a96a22; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: var(--bg); color: var(--text); font-family: Georgia, 'Times New Roman', serif; line-height: 1.8; padding: 2rem 1rem; max-width: 720px; margin: 0 auto; }
      h1 { font-size: 1.6rem; font-weight: 400; text-align: center; color: var(--accent); margin-bottom: 0.5rem; }
      .testament { text-align: center; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--text-muted); margin-bottom: 2rem; }
      .chapters { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 0.4rem; list-style: none; padding: 0; }
      .chapters a { display: block; padding: 0.5rem; text-align: center; background: var(--bg-card); border-radius: 4px; color: var(--text); text-decoration: none; font-family: system-ui, sans-serif; font-size: 0.85rem; transition: background 0.15s; }
      .chapters a:hover { background: var(--accent-soft); color: var(--accent); }
      .footer { text-align: center; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--accent-soft); }
      .footer p { color: var(--text-muted); font-family: system-ui, sans-serif; font-size: 0.75rem; }
      .footer a { color: var(--accent); text-decoration: none; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(book.name)}</h1>
    <p class="testament">${book.number <= 39 ? locale.oldTestament : locale.newTestament} Â· ${book.chapters_count} ${locale.chapters}</p>
    <ul class="chapters">
${chapterLinks}    </ul>
    <div class="footer">
      <p>Read <a href="${bookUrl(book.slug, lang)}">${escapeHtml(book.name)}</a> interactively on <a href="${SITE_BASE}">Apolos Bible</a>.</p>
    </div>
  </body>
</html>
`
}

async function main() {
  const bibleDir = resolve(OUT_DIR, 'bible')
  const spanishDir = resolve(OUT_DIR, 'es', 'bible')
  rmSync(bibleDir, { recursive: true, force: true })
  rmSync(spanishDir, { recursive: true, force: true })

  console.log('[static-chapters] Fetching canonical en/es catalogs...')
  const versions = (await fetchAllVersions()).filter((version) => SITE_LOCALES.includes(version.language))
  const catalogs = new Map()

  for (const lang of SITE_LOCALES) {
    const preferred = pickSeoVersion(versions, lang)
    if (!preferred) throw new Error(`No published Bible version is available for ${lang}`)
    const candidates = [preferred, ...versions.filter((version) => version.language === lang && version.id !== preferred.id)]
    const byNumber = new Map()
    for (const version of candidates) {
      const payload = await fetchVersionDownload(version.id)
      for (const book of payload.books) {
        if (book.number >= 1 && book.number <= 66 && !byNumber.has(book.number)) {
          byNumber.set(book.number, {
            ...book,
            chapters_count: book.chapters.length,
            versionId: version.id,
          })
        }
      }
      if (byNumber.size === 66) break
    }
    if (byNumber.size !== 66) throw new Error(`The ${lang} catalog contains ${byNumber.size}/66 canonical books`)
    catalogs.set(lang, [...byNumber.values()].sort((a, b) => a.number - b.number))
  }

  let totalBooks = 0
  let totalChapters = 0
  for (const lang of SITE_LOCALES) {
    const books = catalogs.get(lang)
    const langDir = lang === 'en' ? bibleDir : spanishDir
    mkdirSync(langDir, { recursive: true })

    for (const book of books) {
      const alternates = SITE_LOCALES.map((alternateLang) => {
        const alternate = catalogs.get(alternateLang).find((candidate) => candidate.number === book.number)
        return { lang: alternateLang, url: bookUrl(alternate.slug, alternateLang) }
      })
      writeFileSync(
        resolve(langDir, `${book.slug}.html`),
        generateBookHtml(book, lang, alternates),
        'utf-8',
      )
      totalBooks++
    }

    const chapters = books.flatMap((book) => Array.from(
      { length: book.chapters_count },
      (_, index) => ({ book, chapter: index + 1 }),
    ))
    totalChapters += chapters.length
    console.log(`[static-chapters] ${lang}: ${books.length} books, ${chapters.length} chapters`)

    let done = 0
    let errors = 0
    async function processOne({ book, chapter }) {
      try {
        const downloadedChapter = book.chapters.find((candidate) => candidate.number === chapter)
        if (!downloadedChapter) throw new Error(`Downloaded chapter missing: ${book.slug}/${chapter}`)
        const data = {
          book: { number: book.number, name: book.name, slug: book.slug },
          chapter: downloadedChapter.number,
          chapter_id: downloadedChapter.id,
          verses: downloadedChapter.verses,
        }
        const alternates = SITE_LOCALES.flatMap((alternateLang) => {
          const alternate = catalogs.get(alternateLang).find((candidate) => candidate.number === book.number)
          return chapter <= alternate.chapters_count
            ? [{ lang: alternateLang, url: chapterUrl(alternate.slug, chapter, alternateLang) }]
            : []
        })
        const slugDir = resolve(langDir, book.slug)
        mkdirSync(slugDir, { recursive: true })
        writeFileSync(
          resolve(slugDir, `${chapter}.html`),
          generateChapterHtml(data, lang, alternates),
          'utf-8',
        )
      } catch (error) {
        errors++
        if (errors <= 5) console.error(`[static-chapters] Error on ${book.slug}/${chapter}:`, error.message)
      }
      done++
      if (done % 200 === 0 || done === chapters.length) {
        console.log(`[static-chapters]   ${done}/${chapters.length} (${errors} errors)`)
      }
    }

    for (let index = 0; index < chapters.length; index += CONCURRENCY) {
      await Promise.all(chapters.slice(index, index + CONCURRENCY).map(processOne))
    }
    if (errors > 0) throw new Error(`${errors} ${lang} chapter pages failed to generate`)
  }

  console.log(`[static-chapters] Done: ${totalBooks} book indexes, ${totalChapters} chapters`)
}

main().catch(err => {
  console.error('[static-chapters] Fatal error:', err.message)
  process.exit(1)
})
