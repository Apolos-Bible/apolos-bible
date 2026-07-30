const DICEBEAR_URL = 'https://api.dicebear.com/10.x/glyphs/svg'
const seedCache = new Map<string, Promise<string>>()

/**
 * Normalizes the identity before hashing so the same email always gets the
 * same avatar, regardless of casing or accidental surrounding whitespace.
 */
export function normalizeAvatarIdentity(identity: string): string {
  return identity.trim().normalize('NFKC').toLowerCase()
}

/**
 * Returns a one-way SHA-256 seed suitable for a public avatar URL.
 *
 * The email itself is never sent to DiceBear. This is not intended to be a
 * password hash (emails can be guessed), but it does prevent the third-party
 * avatar provider from receiving the user's email in the request URL.
 */
export async function hashAvatarSeed(identity: string): Promise<string> {
  const normalized = normalizeAvatarIdentity(identity) || '?'
  const cached = seedCache.get(normalized)
  if (cached) return cached

  const promise = hashNormalizedIdentity(normalized)
  seedCache.set(normalized, promise)
  return promise
}

async function hashNormalizedIdentity(identity: string): Promise<string> {
  const bytes = new TextEncoder().encode(identity)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function getDiceBearAvatarUrl(identity: string): Promise<string> {
  const seed = await hashAvatarSeed(identity)
  return `${DICEBEAR_URL}?seed=${seed}`
}
