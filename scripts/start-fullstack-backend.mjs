import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const backendDirectory = process.env.APOLOS_BACKEND_DIR
  ?? path.resolve(process.cwd(), '../../apolos-backend-testing')

const temporaryDatabaseDirectory = mkdtempSync(path.join(tmpdir(), 'apolos-fullstack-'))
const databasePath = path.join(temporaryDatabaseDirectory, 'database.sqlite')
writeFileSync(databasePath, '')

const environment = process.env
Object.assign(environment, {
  BROADCAST_CONNECTION: 'reverb',
  QUEUE_CONNECTION: 'sync',
  REVERB_APP_ID: 'apolos-fullstack',
  REVERB_APP_KEY: 'apolos-fullstack-key',
  REVERB_APP_SECRET: 'apolos-fullstack-secret',
  REVERB_HOST: '127.0.0.1',
  REVERB_PORT: '8080',
  REVERB_SCHEME: 'http',
  APP_KEY: 'base64:MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
  DB_CONNECTION: 'sqlite',
  DB_DATABASE: databasePath,
})

const migration = spawnSync('php', ['artisan', 'migrate', '--force'], {
  cwd: backendDirectory,
  env: environment,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
if (migration.status !== 0) {
  rmSync(temporaryDatabaseDirectory, { recursive: true, force: true })
  process.exit(migration.status ?? 1)
}

const server = spawn('php', [
  '-S',
  '127.0.0.1:8000',
  '-t',
  '.',
  '../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php',
], {
  cwd: path.join(backendDirectory, 'public'),
  env: environment,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

const reverb = spawn('php', ['artisan', 'reverb:start', '--host=127.0.0.1', '--port=8080'], {
  cwd: backendDirectory,
  env: environment,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

const children = [server, reverb]
let stopping = false

function stop(signal = 'SIGTERM') {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill(signal)
  rmSync(temporaryDatabaseDirectory, { recursive: true, force: true })
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => stop(signal))
}

for (const child of children) child.on('exit', (code, signal) => {
  stop(signal ?? 'SIGTERM')
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
