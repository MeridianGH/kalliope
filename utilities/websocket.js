// Send: Client Info, Playback Status, Receive: Playback Status
// Register with ID

function setup(client) {
  client.websocket = new WebSocket('test.url')

  const send = (data) => {
    data.id = client.id
    this.ws.sendUTF(JSON.stringify(data))
  }

  client.websocket.sendUpdate = (player) => {
    const data = {
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
    send(data)
  }

  client.websocket.addEventListener('open', () => {
    send({
      type: 'login',
      guilds: client.guilds.cache.size,
      users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
    })
  })

  client.websocket.addEventListener('message', (message) => {

  })
}
