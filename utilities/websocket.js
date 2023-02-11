// Send: Client Info, Playback Status, Receive: Playback Status
// Register with ID
import ws from 'websocket'
const { client: WebSocketClient } = ws


export function setupWebsocket(client) {
  function send(ws, type = 'none', data = {}) {
    data.type = data.type ?? type
    data.clientId = client.user.id
    ws.sendUTF(JSON.stringify(data))
  }

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
  websocket.connect('ws://clients.kalliope.xyz:8080')

  websocket.on('connectFailed', (reason) => {
    console.log('[WebSocket] Connection failed with reason: ' + reason)
  })

  websocket.on('connect', (ws) => {
    ws.updatePlayer = (player) => {
      send(ws, 'playerData', simplifyPlayer(player))
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
    send(ws, 'clientData', {
      guilds: client.guilds.cache,
      users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
    })
  })

}
