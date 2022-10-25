// Send: Client Info, Playback Status, Receive: Playback Status
// Register with ID
import ws from 'websocket'
import readline from 'readline'

const { client: WebSocketClient } = ws

export function setup() {
  const client = { id: 1 }

  function send(ws, data) {
    data.clientId = client.id
    ws.sendUTF(JSON.stringify(data))
  }

  function simplifyPlayer(player) {
    return {
      type: 'playerData',
      guild: player.guild,
      queue: player.queue,
      current: player.queue.current,
      paused: player.paused,
      volume: player.volume,
      filter: player.filter,
      position: player.position,
      timescale: player.timescale,
      repeatMode: player.queueRepeat ? 'queue' : player.trackRepeat ? 'track' : 'none'
    }
  }

  const websocket = new WebSocketClient({})
  websocket.connect('ws://clients.kalliope.xyz')

  websocket.on('connectFailed', (reason) => {
    console.log('[WebSocket] Connection failed with reason: ' + reason)
  })

  websocket.on('connect', (connection) => {
    connection.on('close', (reasonCode, description) => {
      console.log('Closed: ' + description)
    })
    connection.on('error', (error) => {
      console.log('Error: ' + error)
    })
    connection.on('message', (message) => {
      if (message.type !== 'utf8') { return }
      const data = JSON.parse(message.utf8Data)
      console.log(data)
      if (data.type === 'ping') { send(connection, { type: 'pong' }) }
    })

    console.log('[WebSocket] Opened WebSocket connection.')
    send(connection, {
      type: 'clientConnectionOpen'
      // guilds: client.guilds.cache.size,
      // users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
    })
  })

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  rl.question('', () => { rl.close() })
}

setup()
