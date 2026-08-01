import { beforeEach, describe, expect, it } from 'vitest'
import { consumeAuthReturnPath, rememberAuthReturnPath } from './authReturnPath'

describe('external auth return path', () => {
  beforeEach(() => sessionStorage.clear())

  it('preserves a game invitation through an external sign-in', () => {
    rememberAuthReturnPath('/juegos?join=AB12CD')
    expect(consumeAuthReturnPath()).toBe('/juegos?join=AB12CD')
    expect(consumeAuthReturnPath()).toBe('/')
  })

  it('does not accept an external redirect target', () => {
    rememberAuthReturnPath('//malicious.example/path')
    expect(consumeAuthReturnPath()).toBe('/')
  })
})
