export function extractAppAssetTags(indexHtml) {
  const head = indexHtml.match(/<head>([\s\S]*?)<\/head>/i)?.[1]
  if (!head) throw new Error('Built index.html does not contain a <head>')

  const tags = head.match(
    /<script\b[^>]*\bsrc="\/assets\/[^"]+"[^>]*><\/script>|<link\b[^>]*\bhref="\/assets\/[^"]+"[^>]*>/gi,
  ) ?? []

  if (!tags.some((tag) => tag.startsWith('<script'))) {
    throw new Error('Built index.html does not contain an application script')
  }
  if (!tags.some((tag) => /rel="stylesheet"/i.test(tag))) {
    throw new Error('Built index.html does not contain an application stylesheet')
  }

  return tags.map((tag) => `    ${tag}`).join('\n')
}

export const STATIC_THEME_BOOTSTRAP = `    <script>
      (() => {
        let preference = 'light'
        try {
          const stored = localStorage.getItem('theme')
          if (stored === 'dark' || stored === 'light' || stored === 'system') preference = stored
        } catch {}

        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
        const resolved = preference === 'system'
          ? (prefersDark ? 'dark' : 'light')
          : preference
        document.documentElement.dataset.theme = resolved
        document.documentElement.dataset.themePreference = preference
      })()
    </script>`

export const STATIC_SEO_FALLBACK_STYLES = `
      html, body, #root, #seo-static { min-height: 100%; margin: 0; }
      html[data-theme="light"], html[data-theme="light"] body, html[data-theme="light"] #root, html[data-theme="light"] #seo-static { background: #f5f7fa; }
      html[data-theme="dark"], html[data-theme="dark"] body, html[data-theme="dark"] #root, html[data-theme="dark"] #seo-static { background: #0f1115; }
      #seo-static .seo-content { color: transparent !important; visibility: hidden; }
      #seo-static .seo-content * { color: transparent !important; border-color: transparent !important; background: transparent !important; }`
