// Send: Client Info, Playback Status, Receive: Playback Status
// Register with ID
import ws from 'websocket'
import { logging } from './logging.js'
const { client: WebSocketClient } = ws

const playerObject = {
  'guild': '610498937874546699',
  'queue': [],
  'voiceChannel': '658690208295944232',
  'textChannel': '658690163290931220',
  'current': {
    'requester': {
      'displayName': 'Meridian',
      'displayAvatarURL': 'https://cdn.discordapp.com/avatars/360817252158930954/5ca503af7e9f9b64c1eee2d4f947a29d.webp'
    },
    'track': 'QAAAiwIAKEppbSBZb3NlZiB4IFJJRUxMIC0gQW5pbWFsIChMeXJpYyBWaWRlbykACUppbSBZb3NlZgAAAAAAArNoAAtRUVgyaHBtdE1KcwABACtodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PVFRWDJocG10TUpzAAd5b3V0dWJlAAAAAAAAAAA=',
    'title': 'Jim Yosef x RIELL - Animal (Lyric Video)',
    'identifier': 'QQX2hpmtMJs',
    'author': 'Jim Yosef',
    'duration': 177000,
    'isSeekable': true,
    'isStream': false,
    'uri': 'https://www.youtube.com/watch?v=QQX2hpmtMJs',
    'thumbnail': 'https://img.youtube.com/vi/QQX2hpmtMJs/maxresdefault.jpg'
  },
  'paused': false,
  'volume': 50,
  'filter': 'none',
  'position': 0,
  'timescale': 1,
  'repeatMode': 'none'
}

export function setupWebsocket(client) {
  function simplifyPlayer(player) {
    return playerObject
    return player ? {
      guild: player.guild,
      queue: player.queue,
      current: (({ requester, ...rest }) => ({ requester: { displayName: requester.displayName, displayAvatarURL: requester.displayAvatarURL() }, ...rest }))(player.queue.current),
      voiceChannel: player.voiceChannel,
      textChannel: player.textChannel,
      paused: player.paused,
      volume: player.volume,
      position: player.position,
      filter: player.filter,
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

  let reconnectDelay = 1000
  const maxDelay = 128000
  websocket.reconnect = () => {
    const randomDelay = Math.floor(Math.random() * 5000)
    logging.info(`[WebSocket] Trying to reconnect in ${reconnectDelay / 1000}s (+${randomDelay / 1000}s variation).`)
    setTimeout(() => {
      websocket.connect('ws://clients.kalliope.xyz:8080')
    }, reconnectDelay + randomDelay)
    if (reconnectDelay < maxDelay) { reconnectDelay *= 2 }
  }

  websocket.on('connectFailed', (reason) => {
    logging.error('[WebSocket] Connection failed with reason: ' + reason)
    websocket.reconnect()
  })

  websocket.on('connect', (ws) => {
    reconnectDelay = 1000

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

    ws.on('close', (reason, description) => {
      logging.error(`[WebSocket] Socket closed with reason: ${reason} | ${description}`)
      websocket.reconnect()
    })

    client.websocket = ws

    logging.success('[WebSocket] Opened WebSocket connection.')
    ws.sendData('clientData', {
      guilds: client.guilds.cache.map((guild) => guild.id),
      users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
    })
  })

}
