import { describe, expect, it } from 'vitest'
import {
  extractAppAssetTags,
  STATIC_SEO_FALLBACK_STYLES,
  STATIC_THEME_BOOTSTRAP,
} from './static-app-shell.mjs'

describe('static Bible application shell', () => {
  it('copies the executable application assets from the Vite build', () => {
    const tags = extractAppAssetTags(`<!doctype html>
      <html><head>
        <script type="module" crossorigin src="/assets/index-abc.js"></script>
        <link rel="modulepreload" href="/assets/chunk-def.js">
        <link rel="stylesheet" href="/assets/index-ghi.css">
      </head><body><div id="root"></div></body></html>`)

    expect(tags).toContain('/assets/index-abc.js')
    expect(tags).toContain('/assets/chunk-def.js')
    expect(tags).toContain('/assets/index-ghi.css')
  })

  it('rejects a shell that cannot boot the application', () => {
    expect(() => extractAppAssetTags('<html><head><meta charset="UTF-8"></head></html>'))
      .toThrow('application script')
  })

  it('resolves the saved theme before the static fallback can paint', () => {
    expect(STATIC_THEME_BOOTSTRAP).toContain("localStorage.getItem('theme')")
    expect(STATIC_THEME_BOOTSTRAP).toContain("prefers-color-scheme: dark")
    expect(STATIC_THEME_BOOTSTRAP).toContain('document.documentElement.dataset.theme = resolved')
  })

  it('hides SEO content while preserving a theme-aware app background', () => {
    expect(STATIC_SEO_FALLBACK_STYLES).toContain('background: #f5f7fa')
    expect(STATIC_SEO_FALLBACK_STYLES).toContain('background: #0f1115')
    expect(STATIC_SEO_FALLBACK_STYLES).toContain('visibility: hidden')
    expect(STATIC_SEO_FALLBACK_STYLES).toContain('color: transparent !important')
  })
})
