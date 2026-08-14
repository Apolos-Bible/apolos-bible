import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const config = JSON.parse(
  readFileSync(resolve(process.cwd(), 'firebase.json'), 'utf8'),
)
const rules = config.hosting.headers

function cacheControl(rule) {
  return rule.headers.find((header) => header.key.toLowerCase() === 'cache-control')?.value
}

describe('Firebase cache configuration', () => {
  it('revalidates route documents while keeping hashed assets immutable', () => {
    const documentRuleIndex = rules.findIndex((rule) => rule.source === '**')
    const assetRuleIndex = rules.findIndex((rule) => rule.source === '/assets/**')

    expect(documentRuleIndex).toBeGreaterThanOrEqual(0)
    expect(assetRuleIndex).toBeGreaterThan(documentRuleIndex)
    expect(cacheControl(rules[documentRuleIndex])).toContain('no-cache')
    expect(cacheControl(rules[documentRuleIndex])).toContain('no-store')
    expect(cacheControl(rules[assetRuleIndex])).toContain('immutable')
  })
})
