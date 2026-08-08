import http from 'node:http'
import net from 'node:net'

const listenPort = Number(process.env.REVERB_PROXY_PORT ?? 8081)
const controlPort = Number(process.env.REVERB_PROXY_CONTROL_PORT ?? 8082)
const targetPort = Number(process.env.REVERB_TARGET_PORT ?? 8080)
const connections = []

const proxy = net.createServer((client) => {
  const upstream = net.createConnection({ host: '127.0.0.1', port: targetPort })
  const connection = { client, upstream, closed: false }
  connections.push(connection)

  client.pipe(upstream)
  upstream.pipe(client)

  const close = () => {
    if (connection.closed) return
    connection.closed = true
    client.destroy()
    upstream.destroy()
  }
  client.on('error', close)
  upstream.on('error', close)
  client.on('close', close)
  upstream.on('close', close)
})

const control = http.createServer((request, response) => {
  if (request.method !== 'POST' || request.url !== '/drop-latest') {
    response.writeHead(404).end()
    return
  }

  const latest = connections.findLast((connection) => !connection.closed)
  if (!latest) {
    response.writeHead(409).end('no active connection')
    return
  }
  latest.client.destroy()
  latest.upstream.destroy()
  response.writeHead(204).end()
})

proxy.listen(listenPort, '127.0.0.1', () => {
  console.log(`Reverb fault proxy listening on 127.0.0.1:${listenPort}`)
})
control.listen(controlPort, '127.0.0.1')

function stop() {
  for (const connection of connections) {
    connection.client.destroy()
    connection.upstream.destroy()
  }
  proxy.close()
  control.close()
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
