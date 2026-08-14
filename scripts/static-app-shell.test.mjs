import { describe, expect, it } from 'vitest'
import { extractAppAssetTags } from './static-app-shell.mjs'

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
})
