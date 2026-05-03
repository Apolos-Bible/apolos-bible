import { writeFileSync, readFileSync, existsSync, statSync } from 'node:fs'
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
const OUT_DIR = resolve(ROOT, 'public')

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

function generateSitemap(langSlugs) {
  const urls = []

  // Homepage
  urls.push({ loc: `${SITE_BASE}/`, priority: '1.0', changefreq: 'daily' })

  for (const [lang, books] of langSlugs) {
    const langPrefix = lang === 'en' ? '' : `${lang}/`
    for (const book of books) {
      urls.push({
        loc: `${SITE_BASE}/bible/${langPrefix}${book.slug}`,
        priority: '0.9',
        changefreq: 'monthly',
      })
      for (let chapter = 1; chapter <= book.chapters_count; chapter++) {
        urls.push({
          loc: `${SITE_BASE}/bible/${langPrefix}${book.slug}/${chapter}`,
          priority: '0.8',
          changefreq: 'monthly',
        })
      }
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`

  return xml
}

async function main() {
  try {
    const sitemapPath = resolve(OUT_DIR, 'sitemap.xml')
    if (existsSync(sitemapPath)) {
      const stat = statSync(sitemapPath)
      const hoursSince = (Date.now() - stat.mtimeMs) / 3600000
      if (hoursSince < 24) {
        console.log(`Sitemap exists (${hoursSince.toFixed(1)}h old), skipping generation`)
        return
      }
    }

    console.log('Fetching versions from API...')
    const versions = await fetchAllVersions()
    console.log(`${versions.length} versions found`)

    // Collect unique slugs per language
    const langSlugs = new Map() // lang → Map(slug → chapters_count)
    for (const v of versions) {
      let books
      try { books = await fetchVersionBooks(v.id) }
      catch (err) { console.error(`Skipping version ${v.id}:`, err.message); continue }

      if (!langSlugs.has(v.language)) langSlugs.set(v.language, new Map())
      const langMap = langSlugs.get(v.language)
      for (const b of books) {
        if (!langMap.has(b.slug)) {
          langMap.set(b.slug, b.chapters_count)
        }
      }
    }

    // Convert to arrays
    const allLangSlugs = new Map()
    for (const [lang, slugs] of langSlugs) {
      const books = []
      for (const [slug, chapters] of slugs) {
        books.push({ slug, chapters_count: chapters })
      }
      allLangSlugs.set(lang, books)
    }

    // Ensure en is first
    const ordered = new Map()
    if (allLangSlugs.has('en')) ordered.set('en', allLangSlugs.get('en'))
    for (const [lang, books] of allLangSlugs) {
      if (lang !== 'en') ordered.set(lang, books)
    }

    const xml = generateSitemap(ordered)

    const outPath = resolve(OUT_DIR, 'sitemap.xml')
    writeFileSync(outPath, xml, 'utf-8')

    let total = 0
    for (const [lang, books] of ordered) {
      const n = books.length + books.reduce((s, b) => s + b.chapters_count, 0)
      console.log(`  ${lang}: ${n} URLs (${books.length} books)`)
      total += n
    }
    console.log(`Sitemap written: ${outPath} (1 homepage + ${total} URLs)`)
  } catch (err) {
    console.error('Failed to generate sitemap:', err.message)
    process.exit(1)
  }
}

main()
