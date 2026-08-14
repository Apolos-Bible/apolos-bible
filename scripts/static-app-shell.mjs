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
