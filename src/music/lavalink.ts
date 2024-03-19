import { spawn } from 'child_process'
import {
  BaseGuildVoiceChannel,
  ChannelType,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  GuildMember,
  GuildTextBasedChannel,
  VoiceState
} from 'discord.js'
import fs from 'fs'
import http from 'http'
import yaml from 'js-yaml'
import { LavalinkManager, Player, SearchResult } from 'lavalink-client'
import { logging } from '../utilities/logging.js'
import { durationOrLive, errorEmbed, msToHMS, simpleEmbed } from '../utilities/utilities.js'
import { CustomFilters } from './customFilters.js'
import { ExtendedSearch } from './extendedSearch.js'
import { LavalinkYML, Requester } from '../types/types'
import path from 'path'

export class Lavalink {
  private client: Client
  manager: LavalinkManager
  constructor(client: Client) {
    this.client = client
    // noinspection JSUnusedGlobalSymbols
    this.manager = new LavalinkManager({
      nodes: [
        /*{
          host: 'localhost',
          port: 2333,
          authorization: 'youshallnotpass'
        },*/
        {
          host: 'lavalink.kalliope.cc',
          port: 443,
          authorization: 'lavalink!Kalliope',
          secure: true
        }
      ],
      sendToShard: (guildId, payload) => client.guilds.cache.get(guildId)?.shard?.send(payload),
      queueOptions: { maxPreviousTracks: 10 }
    })

    this.manager
      .on('trackStart', (player) => {
        setTimeout(() => { client.websocket.updatePlayer(player) }, 500)
      })
      .on('trackStuck', async (player) => {
        const textChannel = client.channels.cache.get(player.textChannelId) as GuildTextBasedChannel
        await textChannel?.send(errorEmbed(`⏭️ Track **${player.queue.current.info.title}** got stuck, skipping...`))
        await player.skip()
      })
      .on('queueEnd', (player) => {
        client.websocket.updatePlayer(player)
        setTimeout(async () => { if (!player.playing && !player.queue.current) { await player.destroy() } }, 30000)
      })
      .on('playerDestroy', (player) => {
        client.websocket.updatePlayer(null, player.guildId)
      })

    this.manager.nodeManager
      .on('connect', (node) => { logging.info(`[Lavalink]  Node ${node.id} connected.`) })
      .on('error', (node, error) => { logging.error(`[Lavalink]  Node ${node.id} encountered an error: ${error.message}`) })

    this.client
      .once('ready', async () => { await this.manager.init({ id: client.user.id, username: client.user.username }) })
      .on('voiceStateUpdate', (oldState, newState) => this._voiceUpdate(oldState, newState))
      .on('raw', (d) => this.manager.sendRawData(d))
  }

  async initialize(): Promise<void> {
    if (!this.manager.options.nodes.find((node) => node.host === 'localhost')) {
      return logging.info('[Lavalink]  No nodes with host \'localhost\' in LavalinkManagerOptions, skipping local Lavalink setup.')
    }

    const doc = yaml.load(fs.readFileSync(path.join(process.cwd(), '/lavalink/template.yml')).toString(), {}) as LavalinkYML
    doc.lavalink.server.youtubeConfig = { PAPISID: process.env.YOUTUBE_PAPISID, PSID: process.env.YOUTUBE_PSID }
    fs.writeFileSync(path.join(process.cwd(), '/lavalink/application.yml'), yaml.dump(doc, {}))

    if (await this._portInUse(doc.server.port)) {
      logging.warn(`[Lavalink]  A server (possibly Lavalink) is already active on port ${doc.server.port}.`)
      return
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        logging.error('[Lavalink]  Failed to start Lavalink within 30s.')
        resolve()
      }, 30000)

      const lavalink = spawn(`cd ${path.join(process.cwd(), 'lavalink')} && java -jar Lavalink.jar`, { shell: true })
      const onData = (chunk: Buffer | string) => {
        const data = chunk.toString().trim()
        if (data.includes('Undertow started')) {
          logging.success('[Lavalink]  Successfully started Lavalink.')
          lavalink.stdout.removeListener('data', onData)
          clearTimeout(timeout)
          resolve()
        } else if (data.toLowerCase().includes('failed')) {
          logging.error('[Lavalink]  Failed to start Lavalink.')
          lavalink.stdout.removeListener('data', onData)
          clearTimeout(timeout)
          resolve()
        }
      }
      lavalink.stdout.on('data', onData)

      process.on('SIGTERM', () => { lavalink.kill() })
      process.on('SIGINT', () => { lavalink.kill() })
    })
  }

  /**
   * Checks if a port is already in use.
   * @param port The port to check.
   * @returns If the port is currently in use.
   */
  private _portInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = http.createServer()
      server.listen(port, () => {
        server.close()
        resolve(false)
      })
      server.on('error', () => { resolve(true) })
    })
  }

  /**
   * Handles voice state updates.
   * @param oldState The old voice state. Usually provided by discord.js.
   * @param newState The new voice state. Usually provided by discord.js.
   */
  private async _voiceUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const me = newState.guild.members.me
    const player = this.getPlayer(newState.guild.id)
    if (!player) { return }

    // Client events
    if (newState.member.id === me.id) {
      // Disconnect
      if (!newState.channelId) {
        await player.destroy()
        return
      }

      // Mute / Unmute
      if (oldState.serverMute !== newState.serverMute) {
        try {
          newState.serverMute ? await player.pause() : await player.resume()
        } catch { /* Ignore play/pause error */ }
      }

      // Stage Channel
      if (newState.channel.type === ChannelType.GuildStageVoice) {
        // Join
        if (!oldState.channel) {
          me.voice.setSuppressed(false).catch(async () => {
            if (!player.paused) { await player.pause() }
            await me.voice.setRequestToSpeak(true)
          })
          return
        }
        // Suppressed
        if (oldState.suppress !== newState.suppress) {
          try {
            newState.suppress ? await player.pause() : await player.resume()
          } catch { /* Ignore play/pause error */ }
          return
        }
      }
      return
    }

    // Channel empty
    if (!newState.channel) {
      const voiceChannel = this.client.channels.cache.get(oldState.channelId) as BaseGuildVoiceChannel
      if (voiceChannel.members.filter((member) => member.id !== me.id).size === 0) {
        const textChannel = this.client.channels.cache.get(player.textChannelId) as GuildTextBasedChannel
        textChannel?.send(simpleEmbed('Left the voice channel because it was empty.'))
        await player.destroy()
      }
      return
    }
  }

  /**
   * Gets a player using a guild ID.
   * @param guildId The guild ID to retrieve the player from.
   * @returns The Lavalink player.
   * @see LavalinkManager.getPlayer
   */
  getPlayer(guildId: string): Player {
    return this.manager.getPlayer(guildId)
  }

  /**
   * Creates a player from a discord.js interaction.
   * @param interaction The interaction that requested a player to be created.
   * @returns The created Lavalink player.
   * @see LavalinkManager.createPlayer
   */
  createPlayer(interaction: ChatInputCommandInteraction): Player {
    const player = this.manager.createPlayer({
      guildId: interaction.guild.id,
      voiceChannelId: (interaction.member as GuildMember).voice.channel.id,
      textChannelId: interaction.channel.id,
      selfDeaf: false,
      volume: 50
    })
    if (!player.plugins?.extendedSearch) { new ExtendedSearch(player) }
    if (!player.plugins?.customFilters) { new CustomFilters(player) }
    return player
  }

  /**
   * Processes and plays a search result.
   * Does no validity checks, make sure the provided data is a valid Player and SearchResult object.
   * @param player The player which processes this request.
   * @param result The previously acquired search result.
   * @returns The response embed used in the reply message.
   */
  async processPlayResult(player: Player, result: SearchResult): Promise<EmbedBuilder> {
    const info = result.playlist ?? result.tracks[0].info
    const isTrack = result.loadType === LoadTypes.track || result.loadType === LoadTypes.search

    await player.queue.add(isTrack ? result.tracks[0] : result.tracks)
    if (!player.playing && !player.paused) { await player.play() }

    return new EmbedBuilder()
      .setAuthor({ name: 'Added to queue.', iconURL: (result.tracks[0].requester as Requester).displayAvatarURL() })
      .setTitle(info.title)
      .setURL(info.uri)
      .setThumbnail(isTrack ? result.tracks[0].info.artworkUrl : result.playlist.thumbnail)
      .addFields(isTrack ? [
        { name: 'Duration', value: durationOrLive(info), inline: true },
        { name: 'Author', value: info.author, inline: true },
        { name: 'Position', value: player.queue.tracks.length.toString(), inline: true }
      ] : [
        { name: 'Duration', value: msToHMS(info.duration), inline: true },
        { name: 'Amount', value: result.tracks.length + ' songs', inline: true },
        { name: 'Position', value: `${player.queue.tracks.length - result.tracks.length + 1}-${player.queue.tracks.length}`, inline: true }
      ])
      .setFooter({ text: 'Kalliope', iconURL: this.client.user.displayAvatarURL() })
  }
}

/**
 * Enumeration for Lavalink load types.
 */
export enum LoadTypes {
  track = 'track',
  playlist = 'playlist',
  search = 'search',
  error = 'error',
  empty = 'empty'
}
