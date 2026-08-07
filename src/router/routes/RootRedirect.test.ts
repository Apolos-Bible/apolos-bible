import { describe, expect, it } from 'vitest'
import { preserveRootCallbackLocation } from './RootRedirect'

describe('preserveRootCallbackLocation', () => {
  it('[AUTH-VERIFY-01] preserves verification callback parameters', () => {
    expect(preserveRootCallbackLocation('/bible/juan/3', '?email_verified=1', ''))
      .toBe('/bible/juan/3?email_verified=1')
  })

  it('preserves query and hash without inventing separators', () => {
    expect(preserveRootCallbackLocation('/bible/genesis/1', '?source=email', '#verse-2'))
      .toBe('/bible/genesis/1?source=email#verse-2')
    expect(preserveRootCallbackLocation('/bible/genesis/1', '', ''))
      .toBe('/bible/genesis/1')
  })
})
