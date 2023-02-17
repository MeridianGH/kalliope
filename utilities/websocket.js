// Send: Client Info, Playback Status, Receive: Playback Status
// Register with ID
import ws from 'websocket'
const { client: WebSocketClient } = ws


export function setupWebsocket(client) {
  function simplifyPlayer(player) {
    return player ? {
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
    } : {}
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
    ws.sendData = (type = 'none', data = {}) => {
      data.type = data.type ?? type
      data.clientId = client.user.id
      ws.sendUTF(JSON.stringify(data))
    }

    ws.updatePlayer = (player) => {
      ws.sendData('playerData', simplifyPlayer(player))
    }

    ws.on('message', (message) => {
      if (message.type !== 'utf8') { return }
      const data = JSON.parse(message.utf8Data)
      console.log('Client received message:')
      console.log(data)

      // const player = client.lavalink.getPlayer(data.guildId)
      const player = null
      switch (data.type) {
        case 'requestPlayerData': {
          ws.sendData('playerData', { guildId: data.guildId, player: simplifyPlayer(player) })
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
    ws.sendData('clientData', {
      guilds: client.guilds.cache.map((guild) => guild.id),
      users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
    })
  })

}
