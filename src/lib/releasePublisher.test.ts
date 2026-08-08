import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('S3 release publisher', () => {
  it('builds immutable assets, stable aliases, checksums and a rewritten updater manifest', () => {
    const root = mkdtempSync(join(tmpdir(), 'apolos-release-'))
    temporaryDirectories.push(root)
    const assets = join(root, 'assets')
    const output = join(root, 'publish')
    mkdirSync(assets)

    const installers = {
      'Apolos_1.6.0_universal.dmg': 'mac installer',
      'Apolos_1.6.0_x64_en-US.msi': 'windows installer',
      'Apolos_1.6.0_amd64.AppImage': 'linux installer',
      'Apolos_1.6.0_universal.apk': 'android installer',
    }
    for (const [name, contents] of Object.entries(installers)) {
      writeFileSync(join(assets, name), contents)
    }

    const updaterArchive = 'Apolos_1.6.0_x64-setup.nsis.zip'
    writeFileSync(join(assets, updaterArchive), 'signed update archive')
    writeFileSync(join(assets, 'latest.json'), JSON.stringify({
      version: '1.6.0',
      platforms: {
        'windows-x86_64': {
          url: `https://github.example/releases/${updaterArchive}`,
          signature: 'minisign-signature',
        },
      },
    }))

    execFileSync(process.execPath, [
      resolve(process.cwd(), 'scripts/prepare-release-publish.mjs'),
      assets,
      output,
      '1.6.0',
      'https://releases.apolos.io/',
    ])

    const manifest = JSON.parse(
      readFileSync(join(output, 'release-manifest.json'), 'utf8'),
    ) as {
      version: string
      downloads: Record<string, { url: string; size: number; sha256: string }>
    }
    expect(manifest.version).toBe('1.6.0')
    expect(manifest.downloads['.msi']).toEqual({
      url: 'https://releases.apolos.io/latest/Apolos.msi',
      size: Buffer.byteLength('windows installer'),
      sha256: createHash('sha256').update('windows installer').digest('hex'),
    })
    expect(readFileSync(join(output, 'latest', 'Apolos.msi'), 'utf8')).toBe('windows installer')
    expect(readFileSync(join(output, 'releases', '1.6.0', updaterArchive), 'utf8'))
      .toBe('signed update archive')

    const updater = JSON.parse(readFileSync(join(output, 'latest.json'), 'utf8')) as {
      platforms: Record<string, { url: string; signature: string }>
    }
    expect(updater.platforms['windows-x86_64']).toEqual({
      url: `https://releases.apolos.io/releases/1.6.0/${updaterArchive}`,
      signature: 'minisign-signature',
    })
  })

  it('fails instead of publishing an incomplete platform set', () => {
    const root = mkdtempSync(join(tmpdir(), 'apolos-release-'))
    temporaryDirectories.push(root)
    const assets = join(root, 'assets')
    mkdirSync(assets)
    writeFileSync(join(assets, 'latest.json'), JSON.stringify({ platforms: {} }))

    expect(() => execFileSync(process.execPath, [
      resolve(process.cwd(), 'scripts/prepare-release-publish.mjs'),
      assets,
      join(root, 'publish'),
      '1.6.0',
      'https://releases.apolos.io',
    ], { stdio: 'pipe' })).toThrow()
  })
})
