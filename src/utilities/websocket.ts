import ws, { client, connection } from 'websocket'
import { LoadTypes } from '../music/lavalink.js'
import { logging } from './logging.js'
import { addMusicControls, simpleEmbed } from './utilities.js'
import { Client, GuildTextBasedChannel } from 'discord.js'
import { Player, SearchResult } from 'lavalink-client'
import { Requester } from '../types/types'


type WSData = { type: string, guildId: string, userId: string, index?: number, volume?: number, query?: string, filter?: string }

const { client: WebSocketClient } = ws

const production = process.argv[2] !== 'development'
const socketURL = production ? 'wss://clients.kalliope.cc' : 'ws://clients.localhost'

/**
 * Websocket client that manages and maintains a connection.
 */
export class WebSocketConnector {
  private client: Client
  private wsClient: client
  private ws: connection
  private reconnectDelay: number

  /**
   * Creates a new websocket client and attaches it to a discord.js client.
   * @param client The discord.js client.
   */
  constructor(client: Client) {
    this.client = client
    this.wsClient = new WebSocketClient({})
    this.ws = null
    this.reconnectDelay = 1000
  }

  /**
   * Simplifies a player object to an object that supports transfer as JSON.
   * @param player The player to convert.
   * @returns A JSON compatible player object.
   */
  simplifyPlayer(player: Player) {
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
   * @param player The player to run the action on.
   * @param data The data object containing the action information.
   */
  async executePlayerAction(player: Player, data: WSData): Promise<void> {
    const textChannel = this.client.channels.cache.get(player?.textChannelId) as GuildTextBasedChannel
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
      case 'volume': {
        await player.setVolume(data.volume)
        await textChannel.send(simpleEmbed(`🔊 Set volume to ${data.volume}%.`))
        break
      }
      case 'play': {
        const member = await (await this.client.guilds.fetch(player.guildId)).members.fetch(data.userId)
        const result = await player.search(data.query, member) as SearchResult
        if (result.loadType === LoadTypes.error) { break }
        if (result.loadType === LoadTypes.empty) { break }

        const embed = await this.client.lavalink.processPlayResult(player, result)

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
   * @param [type] The data type. Is added to `data`.
   * @param [data] The data to send.
   */
  sendData(type: string = 'none', data: { [key: string]: unknown } = {}): void {
    data.type = data.type ?? type
    data.clientId = this.client.user.id
    this.ws?.sendUTF(JSON.stringify(data))
    if (!production) { console.log('bot sent:', data) }
  }

  /**
   * Sends an update containing information about this client.
   */
  updateClientData(): void {
    this.sendData('clientData', {
      guilds: this.client.guilds.cache.map((guild) => guild.id),
      users: this.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
    })
  }

  /**
   * Sends a player update.
   * @param player The player to update.
   */
  updatePlayer(player: Player | null): void {
    this.sendData('playerData', {
      guildId: player.guildId,
      player: this.simplifyPlayer(player)
    })
  }

  /**
   * Handles a WebSocket reconnect.
   */
  private reconnect(): void {
    const maxDelay = 128000
    const randomDelay = Math.floor(Math.random() * 1000)
    logging.info(`[WebSocket] Trying to reconnect in ${this.reconnectDelay / 1000}s (+${randomDelay / 1000}s variation).`)
    setTimeout(() => {
      this.wsClient.connect(socketURL)
    }, this.reconnectDelay + randomDelay)
    if (this.reconnectDelay < maxDelay) {
      this.reconnectDelay *= 2
    }
  }

  /**
   * Initializes a websocket and adds the necessary listeners.
   */
  initialize(): void {
    this.wsClient.connect(socketURL)

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
        if (!production) { console.log('bot received:', data) }

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

      this.updateClientData()
    })
  }

  /**
   * Gracefully closes the WebSocket connection.
   */
  close(): void {
    logging.info('[WebSocket] Closing WebSocket connection.')
    this.ws?.close(1000, 'Socket closed by client.')
  }
}
