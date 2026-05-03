import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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

// Preferred version IDs per language (first match wins for slug ownership).
// Later versions in the list act as fallback if earlier ones don't have a slug.
const PREFERRED_VERSIONS = [
  3,   // en: KJV (King James Version)
  1,   // en: ASV (American Standard Version)
  38,  // es: RVR1960 (Reina-Valera 1960)
  10,  // es: RVR (Reina-Valera)
  22,  // fr: Crampon 1923
  25,  // de: Elberfelder 1905
  30,  // pt: Bíblia Livre
]

function pickBestVersion(versions, lang) {
  // Preferred versions first, then any version in that language
  const langVersions = versions.filter(v => v.language === lang)
  for (const prefId of PREFERRED_VERSIONS) {
    const found = langVersions.find(v => v.id === prefId)
    if (found) return found
  }
  return langVersions[0] || null
}

const OUT_DIR = resolve(ROOT, 'out')

function chapterUrl(slug, n, lang) {
  const langPrefix = lang && lang !== 'en' ? `${lang}/` : ''
  return `${SITE_BASE}/bible/${langPrefix}${slug}/${n}`
}

function seoHead(bookName, slug, chapter, firstVerseText, lang) {
  const title = `${bookName} ${chapter} — Tulia Bible`
  const description = firstVerseText
    ? `${firstVerseText.slice(0, 155).trim()}`
    : `Read ${bookName} chapter ${chapter} in Tulia Bible, the collaborative Bible study app.`
  const canonical = chapterUrl(slug, chapter, lang)
  const breadcrumbs = [
    { '@type': 'ListItem', position: 1, name: 'Tulia Bible', item: SITE_BASE },
    { '@type': 'ListItem', position: 2, name: bookName, item: chapterUrl(slug, 1, lang).replace(/\/\d+$/, '') },
    { '@type': 'ListItem', position: 3, name: `Chapter ${chapter}`, item: canonical },
  ]

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'Tulia Bible', url: SITE_BASE },
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: breadcrumbs },
  })

  return `<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonical}" />

    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${SITE_BASE}/logo.png" />
    <meta property="og:image:width" content="799" />
    <meta property="og:image:height" content="799" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Tulia Bible" />
    <meta property="og:locale" content="en_US" />

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
    <p class="chapter-label">Chapter ${chapter}</p>`
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
  const res = await fetch(`${API_BASE}/versions`)
  if (!res.ok) throw new Error(`Versions API returned ${res.status}`)
  return res.json()
}

async function fetchVersionBooks(versionId) {
  const res = await fetch(`${API_BASE}/versions/${versionId}/books`)
  if (!res.ok) throw new Error(`Books API returned ${res.status} for version ${versionId}`)
  return res.json()
}

async function fetchChapter(slug, chapter, versionId) {
  const url = `${API_BASE}/versions/${versionId}/books/${slug}/chapters/${chapter}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Chapter API returned ${res.status} for ${slug} ${chapter}`)
  return res.json()
}

function generateChapterHtml(data, lang) {
  const { book, chapter, verses } = data
  const firstVerseText = verses.length > 0 ? verses[0].text : null
  let html = seoHead(book.name, book.slug, chapter, firstVerseText, lang)

  for (const v of verses) {
    html += `  <div class="verse"><span class="verse-num">${v.number}</span><span class="verse-text">${escapeHtml(v.text)}</span></div>\n`
  }

  html += `  <nav class="nav">\n    <span></span>\n    <span></span>\n  </nav>\n`
  html += `  <div class="footer">
    <p>Read <a href="${SITE_BASE}/bible/${book.slug}/${chapter}">${escapeHtml(book.name)} ${chapter}</a> interactively on <a href="${SITE_BASE}">Tulia Bible</a> — with highlights, notes, cross-references, and collaborative study.</p>
  </div>\n`
  html += `</body>\n</html>\n`
  return html
}

function generateBookHtml(book, lang) {
  const title = `${book.name} — Tulia Bible`
  const description = `Read the book of ${book.name} (${book.chapters_count} chapters) in Tulia Bible, the collaborative Bible study app.`
  const langPrefix = lang && lang !== 'en' ? `${lang}/` : ''
  const canonical = `${SITE_BASE}/bible/${langPrefix}${book.slug}`

  let chapterLinks = ''
  for (let c = 1; c <= book.chapters_count; c++) {
    chapterLinks += `      <li><a href="${SITE_BASE}/bible/${langPrefix}${book.slug}/${c}">Chapter ${c}</a></li>\n`
  }

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'Tulia Bible', url: SITE_BASE },
  })

  return `<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${SITE_BASE}/logo.png" />
    <meta property="og:image:width" content="799" />
    <meta property="og:image:height" content="799" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Tulia Bible" />
    <meta property="og:locale" content="en_US" />
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
    <p class="testament">${book.testament === 'old' ? 'Old Testament' : 'New Testament'} · ${book.chapters_count} chapters</p>
    <ul class="chapters">
${chapterLinks}    </ul>
    <div class="footer">
      <p>Read <a href="${SITE_BASE}/bible/${book.slug}">${escapeHtml(book.name)}</a> interactively on <a href="${SITE_BASE}">Tulia Bible</a>.</p>
    </div>
  </body>
</html>
`
}

async function main() {
  console.log('[static-chapters] Fetching versions...')
  const versions = await fetchAllVersions()
  console.log(`[static-chapters] ${versions.length} versions found`)

  // Build per-language slug map: slugKey → { lang: { name, versionId, chapters } }
  const slugLangMap = new Map()
  for (const v of versions) {
    let books
    try { books = await fetchVersionBooks(v.id) }
    catch (err) { console.error(`[static-chapters] Skipping version ${v.id}:`, err.message); continue }

    for (const b of books) {
      if (!slugLangMap.has(b.slug)) slugLangMap.set(b.slug, {})
      const entry = slugLangMap.get(b.slug)
      if (!entry[v.language]) {
        entry[v.language] = { name: b.name, versionId: v.id, chapters: b.chapters_count }
      }
    }
  }
  console.log(`[static-chapters] ${slugLangMap.size} unique slugs across languages`)

  // Pick best version per language per slug
  const bestPerLangSlug = new Map() // lang → Map(slug → info)
  for (const [slug, langs] of slugLangMap) {
    for (const lang of Object.keys(langs)) {
      if (!bestPerLangSlug.has(lang)) bestPerLangSlug.set(lang, new Map())
      const langMap = bestPerLangSlug.get(lang)

      // If multiple versions have this slug in this lang, pick preferred
      if (langMap.has(slug)) continue // already picked (first preferred wins via outer loop order? no, versions are iterated in API order)
      langMap.set(slug, langs[lang])
    }
  }

  // Resolve: for each lang+slug, find the actual best version via pickBestVersion
  const outputMap = new Map() // lang → Map(slug → { name, versionId, chapters })
  for (const [lang, slugMap] of bestPerLangSlug) {
    const bestVersion = pickBestVersion(versions, lang)
    if (!bestVersion) continue

    const langOutput = new Map()
    outputMap.set(lang, langOutput)

    for (const [slug, info] of slugMap) {
      // Fetch books from the best version for this language to get correct name
      try {
        const books = await fetchVersionBooks(bestVersion.id)
        const book = books.find(b => b.slug === slug)
        if (book) {
          langOutput.set(slug, { name: book.name, versionId: bestVersion.id, chapters: book.chapters_count })
        }
      } catch (err) {
        // Fallback: use whatever we have
        if (!langOutput.has(slug)) {
          langOutput.set(slug, { name: info.name, versionId: info.versionId, chapters: info.chapters })
        }
      }
    }
  }
  console.log(`[static-chapters] ${outputMap.size} languages: ${[...outputMap.keys()].join(', ')}`)

  // Ensure default language (en) is first
  const defaultLang = 'en'
  const languages = [defaultLang, ...[...outputMap.keys()].filter(l => l !== defaultLang)]
  const isDefault = (lang) => lang === defaultLang

  // Generate book index and chapter pages per language
  const bibleDir = resolve(OUT_DIR, 'bible')
  if (!existsSync(bibleDir)) mkdirSync(bibleDir, { recursive: true })

  let totalChapters = 0
  let totalBooks = 0

  for (const lang of languages) {
    const slugMap = outputMap.get(lang)
    if (!slugMap) continue

    const langPrefix = isDefault(lang) ? '' : `${lang}/`
    const langDir = isDefault(lang) ? bibleDir : resolve(bibleDir, lang)
    if (!existsSync(langDir)) mkdirSync(langDir, { recursive: true })

    // Book index pages
    for (const [slug, info] of slugMap) {
      const slugDir = resolve(langDir, slug)
      if (!existsSync(slugDir)) mkdirSync(slugDir, { recursive: true })
      const html = generateBookHtml({ slug, name: info.name, chapters_count: info.chapters }, lang)
      writeFileSync(resolve(langDir, `${slug}.html`), html, 'utf-8')
      totalBooks++
    }

    // Chapter pages
    const chapters = []
    for (const [slug, info] of slugMap) {
      for (let c = 1; c <= info.chapters; c++) {
        chapters.push({ slug, chapter: c, bookName: info.name, versionId: info.versionId, langDir, lang })
      }
    }
    totalChapters += chapters.length
    console.log(`[static-chapters] ${lang}: ${slugMap.size} books, ${chapters.length} chapters`)

    let done = 0
    let errors = 0
    async function processOne({ slug, chapter, bookName, versionId, langDir, lang }) {
      try {
        const data = await fetchChapter(slug, chapter, versionId)
        const html = generateChapterHtml(data, lang)
        const slugDir = resolve(langDir, slug)
        if (!existsSync(slugDir)) mkdirSync(slugDir, { recursive: true })
        writeFileSync(resolve(slugDir, `${chapter}.html`), html, 'utf-8')
      } catch (err) {
        errors++
        if (errors <= 5) console.error(`[static-chapters] Error on ${slug}/${chapter}:`, err.message)
      }
      done++
      if (done % 200 === 0 || done === chapters.length) {
        console.log(`[static-chapters]   ${done}/${chapters.length} (${errors} errors)`)
      }
    }
    for (let i = 0; i < chapters.length; i += CONCURRENCY) {
      await Promise.all(chapters.slice(i, i + CONCURRENCY).map(processOne))
    }
  }

  console.log(`[static-chapters] Done: ${totalBooks} book indexes, ${totalChapters} chapters`)
}

main().catch(err => {
  console.error('[static-chapters] Fatal error:', err.message)
  process.exit(1)
})
