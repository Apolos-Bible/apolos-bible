import { fileURLToPath } from 'node:url'
import path from 'node:path'

const requiredDownloads = ['.dmg', '.msi', '.AppImage', '.apk']

async function json(response, label) {
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`)
  return response.json()
}

function assertPublicUrl(value, base, prefix, label) {
  const url = new URL(value)
  if (url.origin !== base.origin || !url.pathname.startsWith(prefix)) {
    throw new Error(`${label} must use ${base.origin}${prefix}`)
  }
  return url
}

async function assertReachable(fetchImpl, url, expectedSize, label) {
  const response = await fetchImpl(url, { method: 'HEAD', redirect: 'error' })
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`)
  const length = response.headers.get('content-length')
  if (expectedSize && length && Number(length) !== expectedSize) {
    throw new Error(`${label} size mismatch: expected ${expectedSize}, received ${length}`)
  }
}

export async function verifyPublicRelease(publicUrl, fetchImpl = fetch) {
  const base = new URL(publicUrl.endsWith('/') ? publicUrl : `${publicUrl}/`)
  const latestResponse = await fetchImpl(new URL('latest.json', base), { redirect: 'error' })
  if (latestResponse.status === 404) return { published: false }

  const latest = await json(latestResponse, 'latest.json')
  if (typeof latest.version !== 'string' || latest.version.length === 0) {
    throw new Error('latest.json has no version')
  }
  if (!latest.platforms || typeof latest.platforms !== 'object' || Object.keys(latest.platforms).length === 0) {
    throw new Error('latest.json has no updater platforms')
  }

  for (const [platformName, platform] of Object.entries(latest.platforms)) {
    if (!platform || typeof platform !== 'object' || typeof platform.signature !== 'string' || platform.signature.length === 0) {
      throw new Error(`Updater platform ${platformName} has no signature`)
    }
    const artifact = assertPublicUrl(
      platform.url,
      base,
      `/releases/${encodeURIComponent(latest.version)}/`,
      `Updater platform ${platformName}`,
    )
    await assertReachable(fetchImpl, artifact, null, `Updater platform ${platformName}`)
  }

  const manifest = await json(
    await fetchImpl(new URL('release-manifest.json', base), { redirect: 'error' }),
    'release-manifest.json',
  )
  if (manifest.version !== latest.version) throw new Error('Release manifest version does not match latest.json')

  for (const extension of requiredDownloads) {
    const download = manifest.downloads?.[extension]
    if (!download || !Number.isSafeInteger(download.size) || download.size <= 0) {
      throw new Error(`Release manifest has no valid ${extension} size`)
    }
    if (typeof download.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(download.sha256)) {
      throw new Error(`Release manifest has no valid ${extension} SHA-256`)
    }
    const artifact = assertPublicUrl(download.url, base, '/latest/', `Download ${extension}`)
    await assertReachable(fetchImpl, artifact, download.size, `Download ${extension}`)
  }

  return { published: true, version: latest.version }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  const publicUrl = process.argv[2]
  if (!publicUrl) throw new Error('Usage: node scripts/verify-public-release.mjs <public-url>')
  const result = await verifyPublicRelease(publicUrl)
  console.log(result.published ? `Verified public release ${result.version}` : 'No public release is published yet')
}
