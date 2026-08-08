import { copyFile, cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const [assetsDir, outputDir, version, publicUrl] = process.argv.slice(2)

if (!assetsDir || !outputDir || !version || !publicUrl) {
  throw new Error('Usage: node prepare-release-publish.mjs <assets> <output> <version> <public-url>')
}

const baseUrl = publicUrl.replace(/\/$/, '')
const files = await readdir(assetsDir)
const updaterManifestName = files.find((name) => name === 'latest.json')

if (!updaterManifestName) throw new Error('The release assets did not contain latest.json')

const platforms = {
  '.dmg': files.find((name) => name.endsWith('.dmg')),
  '.msi': files.find((name) => name.endsWith('.msi')),
  '.AppImage': files.find((name) => name.endsWith('.AppImage')),
  '.apk': files.find((name) => name.endsWith('.apk')),
}

for (const [extension, file] of Object.entries(platforms)) {
  if (!file) throw new Error(`Missing public installer ${extension}`)
}

const versionDir = path.join(outputDir, 'releases', version)
const latestDir = path.join(outputDir, 'latest')
await mkdir(versionDir, { recursive: true })
await mkdir(latestDir, { recursive: true })

for (const file of files) {
  await cp(path.join(assetsDir, file), path.join(versionDir, file), { recursive: true })
}

const aliases = {
  '.dmg': 'Apolos.dmg',
  '.msi': 'Apolos.msi',
  '.AppImage': 'Apolos.AppImage',
  '.apk': 'Apolos.apk',
}
const downloads = {}

for (const [extension, file] of Object.entries(platforms)) {
  const alias = aliases[extension]
  await copyFile(path.join(assetsDir, file), path.join(latestDir, alias))
  const { size } = await stat(path.join(assetsDir, file))
  downloads[extension] = { url: `${baseUrl}/latest/${alias}`, size }
}

const updaterManifest = JSON.parse(await readFile(path.join(assetsDir, updaterManifestName), 'utf8'))
for (const platform of Object.values(updaterManifest.platforms ?? {})) {
  const assetName = decodeURIComponent(new URL(platform.url).pathname.split('/').pop())
  if (!files.includes(assetName)) throw new Error(`Updater asset not found: ${assetName}`)
  platform.url = `${baseUrl}/releases/${version}/${encodeURIComponent(assetName)}`
}

await writeFile(path.join(outputDir, 'latest.json'), `${JSON.stringify(updaterManifest, null, 2)}\n`)
await writeFile(path.join(outputDir, 'release-manifest.json'), `${JSON.stringify({
  version,
  published_at: new Date().toISOString(),
  downloads,
}, null, 2)}\n`)
