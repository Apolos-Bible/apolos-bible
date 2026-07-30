import { describe, expect, it } from 'vitest'
import { getDiceBearAvatarUrl, hashAvatarSeed } from '@/lib/avatar'

describe('avatar fallback seed', () => {
  it('is deterministic and normalizes email casing and whitespace', async () => {
    await expect(hashAvatarSeed('  Freddy@Example.com ')).resolves.toBe(
      await hashAvatarSeed('freddy@example.com'),
    )
  })

  it('produces different seeds for different identities', async () => {
    await expect(hashAvatarSeed('freddy@example.com')).resolves.not.toBe(
      await hashAvatarSeed('other@example.com'),
    )
  })

  it('puts only the hash in the DiceBear URL', async () => {
    const email = 'freddy@example.com'
    const url = await getDiceBearAvatarUrl(email)

    expect(url).toMatch(/^https:\/\/api\.dicebear\.com\/10\.x\/glyphs\/svg\?seed=[a-f0-9]{64}$/)
    expect(url).not.toContain(email)
  })
})
