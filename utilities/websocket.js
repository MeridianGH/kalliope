import { EmbedBuilder } from 'discord.js'
import ws from 'websocket'
import { LoadTypes } from '../music/lavalink.js'
import { logging } from './logging.js'
import { addMusicControls, msToHMS, simpleEmbed } from './utilities.js'

const { client: WebSocketClient } = ws

/**
 * Websocket client that manages and maintains a connection.
 */
export class WebSocket {
  /**
   * Creates a new websocket client and attaches it to a discord.js client.
   * @param client {any} The discord.js client.
   */
  constructor(client) {
    this.client = client
    this.wsClient = new WebSocketClient({})
    this.ws = null
    this.reconnectDelay = 1000
  }

  /**
   * Simplifies a player object to an object that supports transfer as JSON.
   * @param player {any} The player to convert.
   * @return {Object}
   */
  simplifyPlayer(player) {
    return player ? {
      guildId: player.guildId,
      voiceChannelId: player.voiceChannelId,
      textChannelId: player.textChannelId,
      paused: player.paused,
      volume: player.volume,
      position: player.position,
      repeatMode: player.repeatMode,
      queue: {
        tracks: player.queue?.tracks?.map((track) => ({
          info: track.info,
          requester: {
            displayName: track.requester.displayName,
            displayAvatarURL: track.requester.displayAvatarURL
          }
        })),
        current: player.queue?.current ? {
          info: player.queue.current.info,
          requester: {
            displayName: player.queue.current.requester.displayName,
            displayAvatarURL: player.queue.current.requester.displayAvatarURL
          }
        } : null
      },
      filters: {
        current: player.filters?.current,
        timescale: player.filters?.timescale
      }
    } : null
  }

  /**
   * Executes an action specified in `data` on the player.
   * @param player {any} The player to run the action on.
   * @param data {{type: string, guildId: string, userId: string, index?: number, volume?: number, query?: string, filter?: string}} The data object containing the action information.
   * @return {Promise<any>}
   */
  async executePlayerAction(player, data) {
    const textChannel = this.client.channels.cache.get(player.textChannelId)
    switch (data.type) {
      case 'pause': {
        player.paused ? await player.resume() : await player.pause()
        await textChannel.send(simpleEmbed(player.paused ? '⏸️ Paused.' : '▶️ Resumed.'))
        break
      }
      case 'skip': {
        if (data.index) {
          const track = player.queue[data.index - 1]
          await player.skip(data.index)
          await textChannel.send(simpleEmbed(`⏭️ Skipped to \`#${data.index}\`: **${track.title}**.`))
        } else if (player.queue.tracks.length === 0) {
          player.destroy()
          await textChannel.send(simpleEmbed('⏹️ Stopped.'))
        } else {
          await player.skip()
          await textChannel.send(simpleEmbed('⏭️ Skipped.'))
        }
        break
      }
      case 'previous': {
        if (player.position > 5000) {
          await player.seek(0)
          break
        }
        const track = player.queue.previous.shift()
        await player.play({ track: track })
        await player.queue.add(player.queue.previous.shift(), 0)
        await textChannel.send(simpleEmbed(`⏮️ Playing previous track \`#0\`: **${track.info.title}**.`))
        break
      }
      case 'shuffle': {
        await player.queue.shuffle()
        await textChannel.send(simpleEmbed('🔀 Shuffled the queue.'))
        break
      }
      case 'repeat': {
        player.repeatMode === 'off' ? player.setRepeatMode('track') :
          player.repeatMode === 'track' ? player.setRepeatMode('queue') :
            player.setRepeatMode('off')
        await textChannel.send(simpleEmbed(`Set repeat mode to ${player.repeatMode === 'queue' ? 'Queue 🔁' : player.repeatMode === 'track' ? 'Track 🔂' : 'Off ▶'}`))
        break
      }
      case 'volume': {
        await player.setVolume(data.volume)
        await textChannel.send(simpleEmbed(`🔊 Set volume to ${data.volume}%.`))
        break
      }
      case 'play': {
        const member = await (await this.client.guilds.fetch(player.guildId)).members.fetch(data.userId)
        const result = await player.search(data.query, member)
        if (result.loadType === LoadTypes.error) { return }
        if (result.loadType === LoadTypes.empty) { return }

        const isTrack = result.loadType === LoadTypes.track || result.loadType === LoadTypes.search
        const info = isTrack ? result.tracks[0].info : result.playlist

        await player.queue.add(isTrack ? result.tracks[0] : result.tracks)
        if (!player.playing && !player.paused) { await player.play() }

        // noinspection JSUnresolvedVariable, JSCheckFunctionSignatures
        const embed = new EmbedBuilder()
          .setAuthor({ name: 'Added to queue.', iconURL: member.user.displayAvatarURL() })
          .setTitle(info.title)
          .setURL(info.uri)
          .setThumbnail(info.artworkUrl)
          .addFields(isTrack ? [
            { name: 'Duration', value: info.isStream ? '🔴 Live' : msToHMS(info.duration), inline: true },
            { name: 'Author', value: info.author, inline: true },
            { name: 'Position', value: player.queue.tracks.length.toString(), inline: true }
          ] : [
            { name: 'Amount', value: result.tracks.length + ' songs', inline: true },
            { name: 'Author', value: info.author, inline: true },
            { name: 'Position', value: `${player.queue.tracks.length - result.tracks.length + 1}-${player.queue.tracks.length}`, inline: true }
          ])
          .setFooter({ text: 'Kalliope', iconURL: this.client.user.displayAvatarURL() })

        const message = await textChannel.send({ embeds: [embed] })
        await addMusicControls(message, player)
        break
      }
      case 'filter': {
        await player.filters.setFilter(data.filter)
        await textChannel.send(simpleEmbed(`Set filter to ${data.filter}.`))
        break
      }
      case 'clear': {
        await player.queue.splice(0, player.queue.tracks.length)
        await textChannel.send(simpleEmbed('🗑️ Cleared the queue.'))
        break
      }
      case 'remove': {
        const track = await player.queue.splice(data.index - 1, 1)
        await textChannel.send(simpleEmbed(`🗑️ Removed track \`#${data.index}\`: **${track.info.title}**`))
        break
      }
    }
  }

  /**
   * Sends data using the WebSocket connection.
   * @param [type] {string} The data type. Is added to `data`.
   * @param [data] {Object} The data to send.
   */
  sendData(type = 'none', data = {}) {
    data.type = data.type ?? type
    data.clientId = this.client.user.id
    this.ws?.sendUTF(JSON.stringify(data))
    // console.log('bot sent:', data)
  }

  updatePlayer(player) {
    this.sendData('playerData', {
      guildId: player.guildId,
      player: this.simplifyPlayer(player)
    })
  }

  reconnect() {
    const maxDelay = 128000
    const randomDelay = Math.floor(Math.random() * 1000)
    logging.info(`[WebSocket] Trying to reconnect in ${this.reconnectDelay / 1000}s (+${randomDelay / 1000}s variation).`)
    setTimeout(async () => {
      await this.wsClient.connect('wss://clients.kalliope.cc')
    }, this.reconnectDelay + randomDelay)
    if (this.reconnectDelay < maxDelay) {
      this.reconnectDelay *= 2
    }
  }

  /**
   * Initializes a websocket and adds the necessary listeners.
   * @return void
   */
  initialize() {
    this.wsClient.connect('wss://clients.kalliope.cc')

    // noinspection JSUnresolvedFunction
    this.wsClient.on('connectFailed', (reason) => {
      logging.error('[WebSocket] Connection failed with reason: ' + reason)
      this.reconnect()
    })

    // noinspection JSUnresolvedFunction
    this.wsClient.on('connect', (ws) => {
      this.reconnectDelay = 1000

      ws.on('message', (message) => {
        if (message.type !== 'utf8') {
          return
        }
        const data = JSON.parse(message.utf8Data)
        // console.log('bot received:', data)

        const player = this.client.lavalink.getPlayer(data.guildId)
        if (data.type === 'requestPlayerData') {
          this.sendData('playerData', {
            guildId: data.guildId,
            player: this.simplifyPlayer(player)
          })
          return
        }

        this.executePlayerAction(player, data).then(() => {
          this.updatePlayer(player)
        })
      })

      ws.on('close', (reason, description) => {
        if (reason === 1000) { return }
        logging.error(`[WebSocket] Socket closed with reason: ${reason} | ${description}`)
        this.reconnect()
      })

      logging.success('[WebSocket] Opened WebSocket connection.')
      this.ws = ws

      this.sendData('clientData', {
        guilds: this.client.guilds.cache.map((guild) => guild.id),
        users: this.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
      })
    })
  }

  close() {
    logging.info('[WebSocket] Closing WebSocket connection.')
    this.ws?.close(1000, 'Socket closed by client.')
  }
}
