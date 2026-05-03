import { writeFileSync, readFileSync } from 'node:fs'
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

function generateSitemap(books) {
  const urls = []

  // Homepage
  urls.push({ loc: `${SITE_BASE}/`, priority: '1.0', changefreq: 'daily' })

  // Book pages and chapter pages
  for (const book of books) {
    urls.push({
      loc: `${SITE_BASE}/bible/${book.slug}`,
      priority: '0.9',
      changefreq: 'monthly',
    })

    for (let chapter = 1; chapter <= book.chapters_count; chapter++) {
      urls.push({
        loc: `${SITE_BASE}/bible/${book.slug}/${chapter}`,
        priority: '0.8',
        changefreq: 'monthly',
      })
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
    console.log('Fetching versions from API...')
    const versions = await fetchAllVersions()
    console.log(`${versions.length} versions found`)

    const slugMap = new Map()
    console.log('Fetching books from all versions...')
    for (const v of versions) {
      try {
        const books = await fetchVersionBooks(v.id)
        for (const b of books) {
          if (!slugMap.has(b.slug)) {
            slugMap.set(b.slug, b.chapters_count)
          }
        }
      } catch (err) {
        console.error(`Skipping version ${v.id} (${v.abbreviation}):`, err.message)
      }
    }
    console.log(`${slugMap.size} unique book slugs collected`)

    const books = []
    for (const [slug, chapters] of slugMap) {
      books.push({ slug, chapters_count: chapters })
    }

    const xml = generateSitemap(books)

    const outPath = resolve(OUT_DIR, 'sitemap.xml')
    writeFileSync(outPath, xml, 'utf-8')
    console.log(`Sitemap written to ${outPath} (${urlsCount(books)} URLs)`)
  } catch (err) {
    console.error('Failed to generate sitemap:', err.message)
    process.exit(1)
  }
}

function urlsCount(books) {
  return 1 + books.length + books.reduce((sum, b) => sum + b.chapters_count, 0)
}

main()
