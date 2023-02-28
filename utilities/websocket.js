import ws from 'websocket'
const { client: WebSocketClient } = ws
import { logging } from './logging.js'
import { addMusicControls, errorEmbed, msToHMS, simpleEmbed } from './utilities.js'
import { EmbedBuilder } from 'discord.js'

export function setupWebsocket(client) {
  function simplifyPlayer(player) {
    // noinspection JSUnresolvedVariable, JSUnresolvedFunction
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

  async function executePlayerAction(player, data) {
    switch (data.type) {
      case 'pause': {
        player.pause(!player.paused)
        await client.channels.cache.get(player.textChannel).send(simpleEmbed(player.paused ? '⏸ Paused.' : '▶ Resumed.'))
        break
      }
      case 'skip': {
        if (data.index) {
          const track = player.queue[data.index - 1]
          player.stop(data.index)
          await client.channels.cache.get(player.textChannel).send(simpleEmbed(`⏭ Skipped to \`#${data.index}\`: **${track.title}**.`))
        } else {
          player.stop()
          await client.channels.cache.get(player.textChannel).send(simpleEmbed('⏭ Skipped.'))
        }
        break
      }
      case 'previous': {
        if (player.previousTracks.length === 0) { return }
        const track = player.previousTracks.pop()
        player.queue.add(track, 0)
        player.manager.once('trackEnd', (player) => { player.queue.add(player.previousTracks.pop(), 0) })
        player.stop()
        await client.channels.cache.get(player.textChannel).send(simpleEmbed(`⏮ Playing previous track \`#0\`: **${track.title}**.`))
        break
      }
      case 'shuffle': {
        player.queue.shuffle()
        await client.channels.cache.get(player.textChannel).send(simpleEmbed('🔀 Shuffled the queue.'))
        break
      }
      case 'repeat': {
        player.trackRepeat ? player.setQueueRepeat(true) : player.queueRepeat ? player.setTrackRepeat(false) : player.setTrackRepeat(true)
        await client.channels.cache.get(player.textChannel).send(simpleEmbed(`Set repeat mode to ${player.queueRepeat ? 'Queue 🔁' : player.trackRepeat ? 'Track 🔂' : 'None ▶'}`))
        break
      }
      case 'volume': {
        player.setVolume(data.volume)
        await client.channels.cache.get(player.textChannel).send(simpleEmbed(`🔊 Set volume to ${data.volume}%.`))
        break
      }
      case 'play': {
        const member = await client.guilds.fetch(player.guild).members.fetch(data.userId)
        const result = await player.search(data.query, member)
        if (result.loadType === 'LOAD_FAILED' || result.loadType === 'NO_MATCHES') { return }

        if (result.loadType === 'PLAYLIST_LOADED') {
          player.queue.add(result.tracks)

          if (player.state !== 'CONNECTED') {
            if (!member.voice.channel) {
              player.destroy()
              return
            }
            player.setVoiceChannel(member.voice.channel.id)
            await player.connect()
          }
          if (!player.playing && !player.paused && player.queue.totalSize === result.tracks.length) { await player.play() }

          // noinspection JSUnresolvedVariable, JSCheckFunctionSignatures
          const embed = new EmbedBuilder()
            .setAuthor({ name: 'Added to queue.', iconURL: member.user.displayAvatarURL() })
            .setTitle(result.playlist.name)
            .setURL(result.playlist.uri)
            .setThumbnail(result.playlist.thumbnail)
            .addFields([
              { name: 'Amount', value: result.tracks.length + ' songs', inline: true },
              { name: 'Author', value: result.playlist.author, inline: true },
              { name: 'Position', value: `${player.queue.indexOf(result.tracks[0]) + 1}-${player.queue.indexOf(result.tracks[result.tracks.length - 1]) + 1}`, inline: true }
            ])
            .setFooter({ text: 'SuitBot', iconURL: client.user.displayAvatarURL() })
          const message = await client.channels.cache.get(player.textChannel).send({ embeds: [embed] })
          await addMusicControls(message, player)
        } else {
          const track = result.tracks[0]
          player.queue.add(track)
          if (player.state !== 'CONNECTED') {
            if (!member.voice.channel) {
              player.destroy()
              return await client.channels.cache.get(player.textChannel).send(errorEmbed('You need to be in a voice channel to use this command.'))
            }
            player.setVoiceChannel(member.voice.channel.id)
            await player.connect()
          }
          if (!player.playing && !player.paused && !player.queue.length) { await player.play() }

          // noinspection JSCheckFunctionSignatures
          const embed = new EmbedBuilder()
            .setAuthor({ name: 'Added to queue.', iconURL: member.user.displayAvatarURL() })
            .setTitle(track.title)
            .setURL(track.uri)
            .setThumbnail(track.thumbnail)
            .addFields([
              { name: 'Duration', value: track.isStream ? '🔴 Live' : msToHMS(track.duration), inline: true },
              { name: 'Author', value: track.author, inline: true },
              { name: 'Position', value: (player.queue.indexOf(track) + 1).toString(), inline: true }
            ])
            .setFooter({ text: 'SuitBot', iconURL: client.user.displayAvatarURL() })
          const message = await client.channels.cache.get(player.textChannel).send({ embeds: [embed] })
          await addMusicControls(message, player)
        }
        break
      }
      case 'filter': {
        // noinspection JSUnresolvedFunction
        player.setFilter(data.filter)
        await client.channels.cache.get(player.textChannel).send(simpleEmbed(`Set filter to ${data.filter}.`))
        break
      }
      case 'clear': {
        player.queue.clear()
        await client.channels.cache.get(player.textChannel).send(simpleEmbed('🗑️ Cleared the queue.'))
        break
      }
      case 'remove': {
        const track = player.queue.remove(data.index - 1)[0]
        await client.channels.cache.get(player.textChannel).send(simpleEmbed(`🗑️ Removed track \`#${data.index}\`: **${track.title}**`))
        break
      }
    }
  }

  const websocket = new WebSocketClient({})
  websocket.connect('ws://clients.kalliope.xyz:8080')

  let reconnectDelay = 1000
  const maxDelay = 128000
  websocket.reconnect = () => {
    const randomDelay = Math.floor(Math.random() * 1000)
    logging.info(`[WebSocket] Trying to reconnect in ${reconnectDelay / 1000}s (+${randomDelay / 1000}s variation).`)
    setTimeout(() => {
      websocket.connect('ws://clients.kalliope.xyz:8080')
    }, reconnectDelay + randomDelay)
    if (reconnectDelay < maxDelay) { reconnectDelay *= 2 }
  }

  // noinspection JSUnresolvedFunction
  websocket.on('connectFailed', (reason) => {
    logging.error('[WebSocket] Connection failed with reason: ' + reason)
    websocket.reconnect()
  })

  // noinspection JSUnresolvedFunction
  websocket.on('connect', (ws) => {
    reconnectDelay = 1000

    ws.sendData = (type = 'none', data = {}) => {
      console.log('sent', data)
      data.type = data.type ?? type
      data.clientId = client.user.id
      ws.sendUTF(JSON.stringify(data))
    }

    ws.updatePlayer = (player) => {
      ws.sendData('playerData', { guildId: player.guild, player: simplifyPlayer(player) })
    }

    ws.on('message', (message) => {
      if (message.type !== 'utf8') { return }
      const data = JSON.parse(message.utf8Data)
      console.log('received', data)

      const player = client.lavalink.getPlayer(data.guildId)
      if (data.type == 'requestPlayerData') {
        ws.sendData('playerData', { guildId: data.guildId, player: simplifyPlayer(player) })
        return
      }

      executePlayerAction(player, data).then(() => { ws.updatePlayer(player) })
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
