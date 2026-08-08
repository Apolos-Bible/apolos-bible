import { describe, expect, it, vi } from 'vitest'
import { verifyPublicRelease } from '../../scripts/verify-public-release.mjs'

const sha256 = 'a'.repeat(64)

function response(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function validFetch() {
  return vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    if (url.pathname === '/latest.json') return response({
      version: '1.6.0',
      platforms: {
        'windows-x86_64': {
          url: 'https://releases.apolos.io/releases/1.6.0/Apolos.nsis.zip',
          signature: 'signed',
        },
      },
    })
    if (url.pathname === '/release-manifest.json') return response({
      version: '1.6.0',
      downloads: Object.fromEntries(['.dmg', '.msi', '.AppImage', '.apk'].map((extension) => [extension, {
        url: `https://releases.apolos.io/latest/Apolos${extension}`,
        size: 42,
        sha256,
      }])),
    })
    if (init?.method === 'HEAD') return response(null, 200, { 'content-length': '42' })
    return response(null, 404)
  })
}

describe('[INFRA-RELEASE-01] public release verifier', () => {
  it('checks signed updater artifacts and all stable platform aliases', async () => {
    const fetchMock = validFetch()
    await expect(verifyPublicRelease('https://releases.apolos.io', fetchMock)).resolves.toEqual({
      published: true,
      version: '1.6.0',
    })
    expect(fetchMock).toHaveBeenCalledTimes(7)
  })

  it('allows an empty bucket before the first release', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(null, 404))
    await expect(verifyPublicRelease('https://releases.apolos.io', fetchMock)).resolves.toEqual({ published: false })
  })

  it('rejects updater URLs outside the branded immutable release prefix', async () => {
    const fetchMock = validFetch()
    fetchMock.mockResolvedValueOnce(response({
      version: '1.6.0',
      platforms: { windows: { url: 'https://attacker.test/update.zip', signature: 'signed' } },
    }))
    await expect(verifyPublicRelease('https://releases.apolos.io', fetchMock)).rejects.toThrow(/must use/)
  })

  it('rejects unsigned updater entries and incomplete download manifests', async () => {
    const unsignedFetch = vi.fn().mockResolvedValue(response({
      version: '1.6.0',
      platforms: { windows: { url: 'https://releases.apolos.io/releases/1.6.0/update.zip', signature: '' } },
    }))
    await expect(verifyPublicRelease('https://releases.apolos.io', unsignedFetch)).rejects.toThrow(/signature/)

    const incompleteFetch = validFetch()
    incompleteFetch.mockResolvedValueOnce(response({
      version: '1.6.0',
      platforms: { windows: { url: 'https://releases.apolos.io/releases/1.6.0/update.zip', signature: 'signed' } },
    }))
    incompleteFetch.mockResolvedValueOnce(response(null, 200))
    incompleteFetch.mockResolvedValueOnce(response({ version: '1.6.0', downloads: {} }))
    await expect(verifyPublicRelease('https://releases.apolos.io', incompleteFetch)).rejects.toThrow(/valid \.dmg size/)
  })
})
