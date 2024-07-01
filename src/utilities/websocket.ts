import WebSocket from 'ws'
import { LoadTypes } from '../music/lavalink.js'
import { logging } from './logging.js'
import { addMusicControls, errorEmbed, simpleEmbed } from './utilities.js'
import { Client, GuildTextBasedChannel, PermissionsBitField } from 'discord.js'
import { Player, SearchResult } from 'lavalink-client'
import { DistributedOmit, Requester } from '../types/types'
import { MessageToClient, MessageToServer, Player as SimplePlayer, Track as SimpleTrack } from 'kalliope-server/src/types/types'
import fs from 'fs'

const production = !process.argv.includes('development')
const socketURL = production ? 'wss://clients.kalliope.cc' : 'ws://clients.localhost'
const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version

/**
 * Simplifies a player object to an object that supports transfer as JSON.
 * @param player The player to convert.
 * @returns A JSON compatible player object.
 */
function simplifyPlayer(player: Player): SimplePlayer | null {
  return player ? {
    guildId: player.guildId,
    voiceChannelId: player.voiceChannelId,
    textChannelId: player.textChannelId,
    paused: player.paused,
    volume: player.volume,
    position: player.position,
    repeatMode: player.repeatMode,
    settings: player.get('settings'),
    queue: {
      tracks: player.queue?.tracks?.map((track) => ({
        info: track.info as SimpleTrack['info'],
        requester: {
          displayName: (track.requester as Requester).displayName,
          displayAvatarURL: (track.requester as Requester).displayAvatarURL()
        }
      })),
      current: player.queue?.current ? {
        info: player.queue.current.info as SimpleTrack['info'],
        requester: {
          displayName: (player.queue.current.requester as Requester).displayName,
          displayAvatarURL: (player.queue.current.requester as Requester).displayAvatarURL()
        },
        segments: player.queue.current.pluginInfo?.clientData?.segments ?? null
      } : null
    },
    filters: {
      current: player.get('filters')?.current,
      timescale: player.get('filters')?.timescale
    }
  } : null
}

/**
 * Executes an action specified in `data` on the player.
 * @param client The client that should execute the action.
 * @param player The player to run the action on.
 * @param data The data object containing the action information.
 * @returns Whether this action was completed successfully or not.
 */
async function executePlayerAction(client: Client, player: Player, data: MessageToClient): Promise<boolean> {
  if (data.type !== 'requestPlayerAction') { return false }
  const textChannel = player?.textChannelId ? client.channels.cache.get(player.textChannelId) as GuildTextBasedChannel : undefined

  switch (data.action) {
    case 'pause': {
      player.paused ? await player.resume() : await player.pause()
      await textChannel?.send(simpleEmbed(player.paused ? '⏸️ Paused.' : '▶️ Resumed.'))
      break
    }
    case 'skip': {
      if (data.payload?.index) {
        const track = player.queue.tracks[data.payload.index - 1]
        await player.skip(data.payload.index)
        await textChannel?.send(simpleEmbed(`⏭️ Skipped to \`#${data.payload.index}\`: **${track.info.title}**.`))
      } else if (player.queue.tracks.length === 0) {
        if (player.get('settings').autoplay) {
          // await player.skip(0, false)
          await player.stopPlaying(false, true)
          await textChannel?.send(simpleEmbed('⏭️ Skipped.'))
          break
        }
        await player.stopPlaying(false, true)
        await textChannel?.send(simpleEmbed('⏹️ Skipped.'))
      } else {
        await player.skip()
        await textChannel?.send(simpleEmbed('⏭️ Skipped.'))
      }
      break
    }
    case 'previous': {
      if (player.queue.previous.length === 0) {
        client.websocket?.sendError(data.guildId, 'No previous songs to play.', data.requestId)
        return false
      }
      if (player.position > 5000) {
        await player.seek(0)
        break
      }
      const track = player.queue.previous.shift()
      await player.play({ track: track })
      await player.queue.add(player.queue.previous.shift(), 0)
      await textChannel?.send(simpleEmbed(`⏮️ Playing previous track \`#0\`: **${track.info.title}**.`))
      break
    }
    case 'shuffle': {
      await player.queue.shuffle()
      await textChannel?.send(simpleEmbed('🔀 Shuffled the queue.'))
      break
    }
    case 'repeat': {
      player.repeatMode === 'off' ? await player.setRepeatMode('track') :
        player.repeatMode === 'track' ? await player.setRepeatMode('queue') :
          await player.setRepeatMode('off')
      await textChannel?.send(simpleEmbed(`Set repeat mode to ${player.repeatMode === 'queue' ? 'Queue 🔁' : player.repeatMode === 'track' ? 'Track 🔂' : 'Off ▶️'}`))
      break
    }
    case 'autoplay': {
      const settings = player.get('settings')
      settings.autoplay = !settings.autoplay
      player.set('settings', settings)
      await textChannel?.send(simpleEmbed(`↩️ Autoplay: ${settings.autoplay ? 'Enabled ✅' : 'Disabled ❌'}`))
      break
    }
    case 'sponsorblock': {
      const settings = player.get('settings')
      if (!settings.sponsorblockSupport) {
        client.websocket?.sendError(data.guildId, 'SponsorBlock is not supported on this player.', data.requestId)
        await textChannel?.send(errorEmbed('SponsorBlock is not supported on this player.'))
        return false
      }
      settings.sponsorblock = !settings.sponsorblock
      player.set('settings', settings)
      player.setSponsorBlock(settings.sponsorblock ? ['music_offtopic'] : [])
      await textChannel?.send(simpleEmbed(`⏭️ SponsorBlock: ${settings.sponsorblock ? 'Enabled ✅' : 'Disabled ❌'}`))
      break
    }
    case 'volume': {
      await player.setVolume(data.payload.volume)
      await textChannel?.send(simpleEmbed(`🔊 Set volume to ${data.payload.volume}%.`))
      break
    }
    case 'play': {
      const guild = client.guilds.cache.get(data.guildId)
      const member = await guild.members.fetch(data.userId)

      if (!player) {
        const channel = member.voice.channel
        if (!channel) {
          client.websocket?.sendError(guild.id, 'You need to be in a voice channel to use this.', data.requestId)
          return false
        }
        if (guild.members.me.voice.channel && channel !== guild.members.me.voice.channel) {
          client.websocket?.sendError(guild.id, 'You need to be in the same voice channel as the bot to use this!', data.requestId)
          return false
        }
        if (!guild.members.me.permissionsIn(channel).has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak])) {
          client.websocket?.sendError(guild.id, 'The bot does not have the correct permissions to play in your voice channel!', data.requestId)
          return false
        }
        player = client.lavalink.createPlayer(data.guildId, channel.id)

        if (!player.connected) {
          if (!member.voice.channel) {
            await player.destroy()
            client.websocket?.sendError(guild.id, 'You need to be in a voice channel to use this.', data.requestId)
            return false
          }
          await player.connect()
        }
      }

      const result = await player.extendedSearch(data.payload.query, member) as SearchResult
      if (result.loadType === LoadTypes.error) {
        client.websocket?.sendError(guild.id, 'There was an error while adding your track to the queue.', data.requestId)
        return false
      }
      if (result.loadType === LoadTypes.empty) {
        client.websocket?.sendError(guild.id, 'There were no tracks found using your query.', data.requestId)
        return false
      }

      const embed = await client.lavalink.processPlayResult(player, result)
      if (textChannel) {
        const message = await textChannel.send({ embeds: [embed] })
        await addMusicControls(message, player)
      }
      break
    }
    case 'filter': {
      await player.get('filters').setFilter(data.payload.filter)
      await textChannel?.send(simpleEmbed(`Set filter to ${data.payload.filterText}.`))
      break
    }
    case 'clear': {
      await player.queue.splice(0, player.queue.tracks.length)
      await textChannel?.send(simpleEmbed('🗑️ Cleared the queue.'))
      break
    }
    case 'remove': {
      const track = await player.queue.splice(data.payload.index - 1, 1)
      await textChannel?.send(simpleEmbed(`🗑️ Removed track \`#${data.payload.index}\`: **${track.info.title}**`))
      break
    }
  }
  return true
}

/**
 * Websocket client that manages and maintains a connection.
 */
export class WebSocketConnector {
  private readonly client: Client
  private ws: WebSocket
  private heartbeatTimeoutId: NodeJS.Timeout
  private reconnectDelay: number
  private static statusCodes = {
    1000: 'Normal Closure',
    1001: 'Going Away',
    1002: 'Protocol Error',
    1003: 'Unsupported Data',
    1004: 'Reserved for future use',
    1005: 'No Status Received',
    1006: 'Abnormal Closure',
    1007: 'Invalid frame payload data',
    1008: 'Policy Violation',
    1009: 'Message too big',
    1010: 'Missing Extension',
    1011: 'Internal Error',
    1012: 'Service Restart',
    1013: 'Try Again Later',
    1014: 'Bad Gateway',
    1015: 'TLS Handshake'
  }

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
   * Resets the heartbeat timeout. Terminates the WebSocket if no ping was recieved for 60s.
   */
  private heartbeatTimeout() {
    clearTimeout(this.heartbeatTimeoutId)
    this.heartbeatTimeoutId = setTimeout(() => {
      logging.warn('[WebSocket] Connection did not receive heartbeat after 60s. Assuming connection is dead.')
      this.ws.terminate()
    }, 60 * 1000 + 1000)
  }

  /**
   * Sends data using the WebSocket connection.
   * @param [data] The data to send.
   */
  private send(data: DistributedOmit<MessageToServer, 'clientId'>): void {
    if (!this.ws) { return }
    const message = Object.assign({ clientId: this.client.user.id }, data)
    this.ws.send(JSON.stringify(message))
    logging.debug('[WebSocket] Sent data:', message)
  }

  /**
   * Sends an update containing information about this client.
   * @param message The message this update should respond to.
   */
  updateClientData(message?: MessageToClient): void {
    this.send({
      requestId: message?.requestId ?? 'none',
      type: 'clientData',
      clientData: {
        guilds: this.client.guilds.cache.map((guild) => guild.id),
        users: this.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
        readyTimestamp: this.client.readyTimestamp,
        ping: this.client.ws.ping,
        displayAvatarURL: this.client.user.displayAvatarURL(),
        displayName: this.client.user.displayName,
        version: version
      }
    })
  }

  /**
   * Sends a player update.
   * @param player The player to send.
   */
  updatePlayer(player: Player): void {
    this.send({ type: 'playerData', guildId: player.guildId, player: simplifyPlayer(player) })
  }

  /**
   * Sends an empty player object.
   * @param guildId The guild to update.
   */
  clearPlayer(guildId: string) {
    this.send({ type: 'playerData', guildId: guildId, player: null })
  }

  /**
   * Sends an error message.
   * @param guildId The affected guild.
   * @param message The error message.
   * @param requestId The request ID if this error happened in response to a request.
   */
  sendError(guildId: string, message: string, requestId?: string) {
    this.send({ type: 'error', guildId: guildId, errorMessage: message, requestId: requestId })
  }

  /**
   * Opens a new WebSocket connection.
   */
  connect(): void {
    this.ws = new WebSocket(socketURL)

    this.ws.on('error', (event) => {
      logging.error('[WebSocket] Connection encountered an error: ' + event.message)
    })

    this.ws.on('open', () => {
      logging.success('[WebSocket] Opened WebSocket connection.')
      this.reconnectDelay = 1000
      this.updateClientData()
      this.heartbeatTimeout()
    })

    this.ws.on('close', (code, reason) => {
      logging.error(`[WebSocket] Socket closed with reason: ${code} (${WebSocketConnector.statusCodes[code]}) | ${reason}`)
      clearTimeout(this.heartbeatTimeoutId)
      this.reconnect(code)
    })

    this.ws.on('ping', () => {
      this.heartbeatTimeout()
    })

    this.ws.on('message', async (data) => {
      const message = JSON.parse(data.toString()) as MessageToClient
      logging.debug('[WebSocket] Received data:', message)

      switch (message.type) {
        case 'requestPlayerData': {
          const player = this.client.lavalink.getPlayer(message.guildId)
          this.send({ type: 'playerData', guildId: message.guildId, player: simplifyPlayer(player), requestId: message.requestId ?? 'none' })
          break
        }
        case 'requestClientData': {
          this.updateClientData(message)
          break
        }
        case 'requestPlayerAction': {
          const player = this.client.lavalink.getPlayer(message.guildId)
          const success = await executePlayerAction(this.client, player, message)
          if (success) {
            this.send({
              requestId: message.requestId,
              type: 'playerData',
              guildId: message.guildId,
              player: simplifyPlayer(this.client.lavalink.getPlayer(message.guildId))
            })
          }
          break
        }
      }
    })
  }

  /**
   * Handles a WebSocket reconnect.
   * @param code The reason code why the WebSocket was closed.
   */
  private reconnect(code: number): void {
    if (code === 1000) { return }

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
    this.send({ type: 'clientData', clientData: null })
    logging.info('[WebSocket] Closing WebSocket connection.')
    this.ws.close(1000, 'Socket closed by client.')
  }
}
