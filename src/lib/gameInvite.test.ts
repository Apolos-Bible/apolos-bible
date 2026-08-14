import { describe, expect, it } from 'vitest'
import { gameInvitePath, gameInviteUrl, normalizeGameCode } from './gameInvite'

describe('game lobby invitations', () => {
  it('normalizes valid room codes and rejects malformed ones', () => {
    expect(normalizeGameCode(' ab12cd ')).toBe('AB12CD')
    expect(normalizeGameCode('ABCDE')).toBeNull()
    expect(normalizeGameCode('ABC-12')).toBeNull()
  })

  it('creates a public join URL without exposing the room id', () => {
    expect(gameInvitePath('ab12cd')).toBe('/juegos?join=AB12CD')
    expect(gameInviteUrl('ab12cd', 'https://example.test/app/')).toBe(
      'https://example.test/juegos?join=AB12CD',
    )
  })
})
