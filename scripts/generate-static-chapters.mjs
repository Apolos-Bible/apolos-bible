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
const VERSION_ID = 1
const CONCURRENCY = 8

const OUT_DIR = resolve(ROOT, 'out')

function chapterUrl(slug, n) {
  return `${SITE_BASE}/bible/${slug}/${n}`
}

function seoHead(bookName, slug, chapter, firstVerseText) {
  const title = `${bookName} ${chapter} — Tulia Bible`
  const description = firstVerseText
    ? `${firstVerseText.slice(0, 155).trim()}`
    : `Read ${bookName} chapter ${chapter} in Tulia Bible, the collaborative Bible study app.`
  const canonical = chapterUrl(slug, chapter)
  const breadcrumbs = [
    { '@type': 'ListItem', position: 1, name: 'Tulia Bible', item: SITE_BASE },
    { '@type': 'ListItem', position: 2, name: bookName, item: `${SITE_BASE}/bible/${slug}` },
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

async function fetchBooks() {
  const res = await fetch(`${API_BASE}/versions/${VERSION_ID}/books`)
  if (!res.ok) throw new Error(`Books API returned ${res.status}`)
  return res.json()
}

async function fetchChapter(slug, chapter) {
  const url = `${API_BASE}/versions/${VERSION_ID}/books/${slug}/chapters/${chapter}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Chapter API returned ${res.status} for ${slug} ${chapter}`)
  return res.json()
}

function generateChapterHtml(data) {
  const { book, chapter, verses } = data
  const firstVerseText = verses.length > 0 ? verses[0].text : null
  let html = seoHead(book.name, book.slug, chapter, firstVerseText)

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

function generateBookHtml(book) {
  const title = `${book.name} — Tulia Bible`
  const description = `Read the book of ${book.name} (${book.chapters_count} chapters) in Tulia Bible, the collaborative Bible study app.`
  const canonical = `${SITE_BASE}/bible/${book.slug}`

  let chapterLinks = ''
  for (let c = 1; c <= book.chapters_count; c++) {
    chapterLinks += `      <li><a href="${SITE_BASE}/bible/${book.slug}/${c}">Chapter ${c}</a></li>\n`
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
  console.log('[static-chapters] Fetching book list...')
  const books = await fetchBooks()
  console.log(`[static-chapters] ${books.length} books loaded`)

  // Generate book index pages
  console.log('[static-chapters] Generating book index pages...')
  for (const book of books) {
    const bookDir = resolve(OUT_DIR, 'bible', book.slug)
    if (!existsSync(bookDir)) mkdirSync(bookDir, { recursive: true })
    const html = generateBookHtml(book)
    writeFileSync(resolve(bookDir, 'index.html'), html, 'utf-8')
  }
  console.log('[static-chapters] 66 book index pages written')

  // Generate chapter pages
  const allChapters = []
  for (const book of books) {
    for (let c = 1; c <= book.chapters_count; c++) {
      allChapters.push({ slug: book.slug, chapter: c, bookName: book.name })
    }
  }
  console.log(`[static-chapters] Generating ${allChapters.length} chapter pages...`)

  let done = 0
  let errors = 0

  async function processOne({ slug, chapter, bookName }) {
    try {
      const data = await fetchChapter(slug, chapter)
      const html = generateChapterHtml(data)
      const dir = resolve(OUT_DIR, 'bible', slug, String(chapter))
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeFileSync(resolve(dir, 'index.html'), html, 'utf-8')
    } catch (err) {
      errors++
      if (errors <= 5) {
        console.error(`[static-chapters] Error on ${slug}/${chapter}:`, err.message)
      }
    }
    done++
    if (done % 50 === 0 || done === allChapters.length) {
      console.log(`[static-chapters] ${done}/${allChapters.length} chapters (${errors} errors)`)
    }
  }

  // Process with concurrency
  for (let i = 0; i < allChapters.length; i += CONCURRENCY) {
    const batch = allChapters.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(processOne))
  }

  console.log(`[static-chapters] Done: ${done} chapters, ${errors} errors`)
  if (errors > 0) {
    console.error(`[static-chapters] WARNING: ${errors} chapters failed to generate`)
  }
}

main().catch(err => {
  console.error('[static-chapters] Fatal error:', err.message)
  process.exit(1)
})
