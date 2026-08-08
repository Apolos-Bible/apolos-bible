import http from 'node:http'
import { writeFile } from 'node:fs/promises'

const [outputPath, rawPort = '43119'] = process.argv.slice(2)
const port = Number(rawPort)

if (!outputPath || !Number.isSafeInteger(port) || port < 1024 || port > 65535) {
  throw new Error('Usage: node scripts/native-acceptance-server.mjs <output-path> [port]')
}

const server = http.createServer((request, response) => {
  if (request.method !== 'POST' || request.url !== '/accepted') {
    response.writeHead(404).end()
    return
  }

  let body = ''
  request.setEncoding('utf8')
  request.on('data', (chunk) => {
    body += chunk
    if (body.length > 2048) request.destroy(new Error('Acceptance payload too large'))
  })
  request.on('end', async () => {
    if (!/^\/auth\/(google|youversion)\/finish(?:\?[^#]*)?#token=<present>$/.test(body)) {
      response.writeHead(422).end()
      return
    }
    await writeFile(outputPath, `${body}\n`, 'utf8')
    response.writeHead(204).end()
    server.close()
  })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Native acceptance server listening on 127.0.0.1:${port}`)
})

setTimeout(() => {
  console.error('Timed out waiting for the packaged application deep link')
  server.close(() => process.exit(1))
}, 120_000).unref()
