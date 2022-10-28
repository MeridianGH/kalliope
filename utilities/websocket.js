// Send: Client Info, Playback Status, Receive: Playback Status
// Register with ID
import ws from 'websocket'
import readline from 'readline'

const { client: WebSocketClient } = ws

export function setup(client) {
  client = { id: 1 }

  function simplifyPlayer(player) {
    return {
      guild: player.guild,
      queue: player.queue,
      channel: player.channel.id,
      current: player.queue.current,
      paused: player.paused,
      volume: player.volume,
      filter: player.filter,
      position: player.position,
      timescale: player.timescale,
      repeatMode: player.queueRepeat ? 'queue' : player.trackRepeat ? 'track' : 'none'
    }
  }

  function executePlayerAction(player, action, index) {
    switch (action) {
      case 'play': {
        // Play function
        break
      }
    }
  }

  const websocket = new WebSocketClient({})
  websocket.connect('ws://clients.kalliope.xyz')

  websocket.on('connectFailed', (reason) => {
    console.log('[WebSocket] Connection failed with reason: ' + reason)
  })

  websocket.on('connect', (ws) => {
    ws.send = (type = 'none', data = {}) => {
      data.type = data.type ?? type
      data.clientId = client.id
      ws.sendUTF(JSON.stringify(data))
    }

    ws.updatePlayer = (player) => {
      ws.send('playerData', simplifyPlayer(player))
    }

    ws.on('message', (message) => {
      if (message.type !== 'utf8') { return }
      const data = JSON.parse(message.utf8Data)
      console.log('Client received message:')
      console.log(data)

      const player = client.lavalink.getPlayer(data.guildId)
      switch (data.type) {
        case 'requestPlayerData': {
          const playerData = simplifyPlayer(player)
          ws.send('playerData', playerData ?? {})
          break
        }
        case 'playerAction': {
          executePlayerAction(player, data.action, data.index)
          break
        }
      }
    })

    client.websocket = ws

    console.log('[WebSocket] Opened WebSocket connection.')
    ws.send('clientData', {
      // guilds: client.guilds.cache.size,
      // users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
    })

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question('', () => {
      ws.close()
      rl.close()
    })
  })

}

setup()
