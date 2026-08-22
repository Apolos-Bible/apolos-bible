import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

describe('PWA navigation scope', () => {
  it('keeps every same-origin app route inside the standalone window', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(root, 'public/manifest.webmanifest'), 'utf8'),
    )

    expect(manifest.id).toBe('/')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(manifest.display).toBe('standalone')
  })

  it('links the web app manifest from the application shell', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8')

    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />')
  })
})
