import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'))
const cargoPath = join(rootDir, 'src-tauri', 'Cargo.toml')
let cargo = readFileSync(cargoPath, 'utf-8')

cargo = cargo.replace(/^version\s*=\s*".*"$/m, `version = "${pkg.version}"`)

writeFileSync(cargoPath, cargo)
console.log(`[sync-version] Cargo.toml → ${pkg.version}`)
