import { readFileSync, renameSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf-8'))
const version = pkg.version

const base = resolve(import.meta.dirname, '../src-tauri/gen/android/app/build/outputs')

const files = [
  { from: 'apk/universal/release/app-universal-release-unsigned.apk', to: `apk/universal/release/Tulia Study_${version}.apk` },
  { from: 'bundle/universalRelease/app-universal-release.aab', to: `bundle/universalRelease/Tulia Study_${version}.aab` },
]

for (const { from, to } of files) {
  const src = resolve(base, from)
  const dst = resolve(base, to)
  if (existsSync(src)) {
    const dstDir = dirname(dst)
    if (!existsSync(dstDir)) continue
    renameSync(src, dst)
    console.log(`Renamed: ${from} -> ${dst}`)
  }
}
