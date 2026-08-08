import { spawn } from 'node:child_process'
import path from 'node:path'

const backendDirectory = process.env.APOLOS_BACKEND_DIR
  ?? path.resolve(process.cwd(), '../apolos-backend-testing')

const server = spawn('php', [
  '-S',
  '127.0.0.1:8000',
  '-t',
  '.',
  '../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php',
], {
  cwd: path.join(backendDirectory, 'public'),
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal))
}

server.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
