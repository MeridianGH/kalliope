import WebSocket from 'ws'
import { LoadTypes } from '../music/lavalink.js'
import { logging } from './logging.js'
import { addMusicControls, simpleEmbed } from './utilities.js'
import { Client, GuildTextBasedChannel } from 'discord.js'
import { Player, SearchResult } from 'lavalink-client'
import { Requester, WSData } from '../types/types'

const production = !process.argv.includes('development')
const socketURL = production ? 'wss://clients.kalliope.cc' : 'ws://clients.localhost'

/**
 * Simplifies a player object to an object that supports transfer as JSON.
 * @param player The player to convert.
 * @returns A JSON compatible player object.
 */
function simplifyPlayer(player: Player) {
  return player ? {
    guildId: player.guildId,
    voiceChannelId: player.voiceChannelId,
    textChannelId: player.textChannelId,
    paused: player.paused,
    volume: player.volume,
    position: player.position,
    repeatMode: player.repeatMode,
    autoplay: player.get('autoplay'),
    queue: {
      tracks: player.queue?.tracks?.map((track) => ({
        info: track.info,
        requester: {
          displayName: (track.requester as Requester).displayName,
          displayAvatarURL: (track.requester as Requester).displayAvatarURL()
        }
      })),
      current: player.queue?.current ? {
        info: player.queue.current.info,
        requester: {
          displayName: (player.queue.current.requester as Requester).displayName,
          displayAvatarURL: (player.queue.current.requester as Requester).displayAvatarURL()
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
 * @param client The client that should execute the action.
 * @param player The player to run the action on.
 * @param data The data object containing the action information.
 */
async function executePlayerAction(client: Client, player: Player, data: WSData): Promise<void> {
  const textChannel = client.channels.cache.get(player?.textChannelId) as GuildTextBasedChannel
  if (!textChannel) { return }
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
        await textChannel.send(simpleEmbed(`⏭️ Skipped to \`#${data.index}\`: **${track.info.title}**.`))
      } else if (player.queue.tracks.length === 0) {
        if (player.get('autoplay')) {
          // await player.skip(0, false)
          await player.stopPlaying(false, true)
          await textChannel.send(simpleEmbed('⏭️ Skipped.'))
          break
        }
        await player.destroy()
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
      player.repeatMode === 'off' ? await player.setRepeatMode('track') :
        player.repeatMode === 'track' ? await player.setRepeatMode('queue') :
          await player.setRepeatMode('off')
      await textChannel.send(simpleEmbed(`Set repeat mode to ${player.repeatMode === 'queue' ? 'Queue 🔁' : player.repeatMode === 'track' ? 'Track 🔂' : 'Off ▶️'}`))
      break
    }
    case 'autoplay': {
      const autoplay = !player.get('autoplay')
      player.set('autoplay', autoplay)
      await textChannel.send(simpleEmbed(`↩️ Autoplay: ${autoplay ? 'Enabled ✅' : 'Disabled ❌'}`))
      break
    }
    case 'volume': {
      await player.setVolume(data.volume)
      await textChannel.send(simpleEmbed(`🔊 Set volume to ${data.volume}%.`))
      break
    }
    case 'play': {
      const member = await (await client.guilds.fetch(player.guildId)).members.fetch(data.userId)
      const result = await player.extendedSearch(data.query, member) as SearchResult
      if (result.loadType === LoadTypes.error) { break }
      if (result.loadType === LoadTypes.empty) { break }

      const embed = await client.lavalink.processPlayResult(player, result)

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
 * Websocket client that manages and maintains a connection.
 */
export class WebSocketConnector {
  private client: Client
  private ws: WebSocket
  private reconnectDelay: number

  /**
   * Creates a new websocket client and attaches it to a discord.js client.
   * @param client The discord.js client.
   */
  constructor(client: Client) {
    this.client = client
    this.ws = null
    this.reconnectDelay = 1000
  }

  /**
   * Sends data using the WebSocket connection.
   * @param [type] The data type. Is added to `data`.
   * @param [data] The data to send.
   */
  private send(type: 'clientData' | 'playerData', data: { [key: string]: unknown } = {}): void {
    if (!this.ws) { return }
    data.type = type
    data.clientId = this.client.user.id
    this.ws.send(JSON.stringify(data))
    logging.debug('[WebSocket] Sent data:', data)
  }

  /**
   * Sends an update containing information about this client.
   */
  updateClientData(): void {
    this.send('clientData', {
      guilds: this.client.guilds.cache.map((guild) => guild.id),
      users: this.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
    })
  }

  /**
   * Sends a player update.
   * @param player The player to send.
   * @param guildId If not specifying a player, provide a guildId to send a 'null' update anyway.
   */
  updatePlayer(player: Player | null, guildId?: string): void {
    this.send('playerData', {
      guildId: player?.guildId ?? guildId,
      player: simplifyPlayer(player)
    })
  }

  /**
   * Opens a new WebSocket connection.
   */
  connect(): void {
    this.ws = new WebSocket(socketURL)

    this.ws.addEventListener('error', (event) => {
      logging.debug(event)
      logging.error('[WebSocket] Connection failed with reason: ' + event.message)
      this.reconnect()
    })

    this.ws.addEventListener('open', () => {
      logging.success('[WebSocket] Opened WebSocket connection.')
      this.reconnectDelay = 1000
      this.updateClientData()
    })

    this.ws.addEventListener('close', (event) => {
      if (event.wasClean) { return }
      logging.error(`[WebSocket] Socket closed with reason: ${event.code} | ${event.reason}`)
      this.reconnect()
    })

    this.ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data.toString()) as WSData
      logging.debug('[WebSocket] Received data:', event.data)

      const player = this.client.lavalink.getPlayer(data.guildId)
      if (data.type === 'requestPlayerData') {
        this.send('playerData', {
          guildId: data.guildId,
          player: simplifyPlayer(player)
        })
        return
      }

      executePlayerAction(this.client, player, data).then(() => {
        this.updatePlayer(player)
      })
    })
  }

  /**
   * Handles a WebSocket reconnect.
   */
  private reconnect(): void {
    const maxDelay = 128000
    const randomDelay = Math.floor(Math.random() * 2000)
    logging.warn(`[WebSocket] Trying to reconnect in ${this.reconnectDelay / 1000}s (+${randomDelay / 1000}s variation).`)
    setTimeout(() => {
      this.connect()
    }, this.reconnectDelay + randomDelay)
    if (this.reconnectDelay < maxDelay) {
      this.reconnectDelay *= 2
    }
  }

  /**
   * Gracefully closes the WebSocket connection.
   */
  close(): void {
    if (!this.ws) { return }
    logging.info('[WebSocket] Closing WebSocket connection.')
    this.ws.close(1000, 'Socket closed by client.')
  }
}
