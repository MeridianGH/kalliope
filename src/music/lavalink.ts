import { spawn } from 'child_process'
import { BaseGuildVoiceChannel, ChannelType, Client, EmbedBuilder, GuildTextBasedChannel, VoiceState } from 'discord.js'
import fs from 'fs'
import http from 'http'
import yaml from 'js-yaml'
import { LavalinkManager, Player, PlayerOptions, SearchResult } from 'lavalink-client'
import { logging } from '../utilities/logging.js'
import { durationOrLive, errorEmbed, formatMusicFooter, msToHMS, simpleEmbed } from '../utilities/utilities.js'
import { CustomFilters } from './customFilters.js'
import { ExtendedSearch } from './extendedSearch.js'
import { ChatOrMenuInteraction, LavalinkYML, Requester } from '../types/types'
import path from 'path'
import { ChildProcessWithoutNullStreams } from 'node:child_process'
import { iconURL } from '../events/ready.js'

export class Lavalink {
  private readonly client: Client
  private process: ChildProcessWithoutNullStreams
  manager: LavalinkManager
  constructor(client: Client) {
    this.client = client
    // noinspection JSUnusedGlobalSymbols
    this.manager = new LavalinkManager({
      nodes: [
        /* {
          host: 'localhost',
          port: 2333,
          authorization: 'youshallnotpass'
        }, */
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
        setTimeout(() => { client.websocket?.updatePlayer(player) }, 500)
      })
      .on('trackError', (player, track, payload) => {
        logging.warn(`[Lavalink]  Encountered error while playing track '${track?.info.title ?? 'Unknown track'}'.`)
        logging.debug('[Lavalink]  Exception message: ', payload.exception?.message)
        const textChannel = client.channels.cache.get(player.textChannelId ?? '') as GuildTextBasedChannel
        void textChannel?.send(errorEmbed(`There was an error while playing track '${track?.info.title ?? 'Unknown track'}'.`))
        void player.stopPlaying(false, true)
        client.websocket?.sendError(player.guildId, `There was an error while playing track '${track?.info.title ?? 'Unknown track'}'.`)
      })
      .on('queueEnd', (player, track) => {
        if (player.get('settings').autoplay) {
          if (!track) { return }
          void player.executeAutoplay(this.client, track)
          return
        }
        client.websocket?.updatePlayer(player)
        setTimeout(() => {
          if (!player.playing && !player.queue.current) {
            const textChannel = this.client.channels.cache.get(player.textChannelId ?? '') as GuildTextBasedChannel
            void textChannel?.send(simpleEmbed('ℹ️ Left the voice channel due to inactivity.'))
            void player.destroy()
          }
        }, 30000)
      })
      .on('playerDestroy', (player) => {
        for (const collector of player.get('collectors')) {
          collector.stop()
        }
        client.websocket?.clearPlayer(player.guildId)
      })
      .on('SegmentsLoaded', (player, track, payload) => {
        if (!track) {
          if (!player.queue.current) { return }
          track = player.queue.current
        }
        track.pluginInfo.clientData = { ...track.pluginInfo.clientData, segments: payload.segments }
      })

    this.manager.nodeManager
      .on('connect', (node) => { logging.info(`[Lavalink]  Node ${node.id} connected.`) })
      .on('error', (node, error) => { logging.error(`[Lavalink]  Node ${node.id} encountered an error: ${error}`) })

    this.client
      .once('ready', (client) => { void this.manager.init({ id: client.user.id, username: client.user.username }) })
      .on('voiceStateUpdate', (oldState, newState) => void this._voiceUpdate(oldState, newState))
      .on('raw', (d) => void this.manager.sendRawData(d)) // eslint-disable-line @typescript-eslint/no-unsafe-argument
  }

  async initialize(): Promise<void> {
    const doc = yaml.load(fs.readFileSync(path.join(process.cwd(), '/lavalink/template.yml')).toString(), {}) as LavalinkYML
    doc.lavalink.server.youtubeConfig = { PAPISID: process.env.YOUTUBE_PAPISID, PSID: process.env.YOUTUBE_PSID }
    fs.writeFileSync(path.join(process.cwd(), '/lavalink/application.yml'), yaml.dump(doc, {}))

    if (!this.manager.options.nodes.find((node) => node.host === 'localhost')) {
      return logging.info('[Lavalink]  No nodes with host \'localhost\' in LavalinkManagerOptions, skipping local Lavalink setup.')
    }

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
      this.process = lavalink
    })
  }

  async destroy(): Promise<void> {
    logging.info(`[Lavalink]  Closing ${this.manager.players.size} queues.`)
    const playerPromises: Promise<unknown>[] = []
    this.manager.players.forEach((player) => {
      const textChannel = this.client.channels.cache.get(player.textChannelId ?? '') as GuildTextBasedChannel
      void textChannel?.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Shutdown.')
            .setDescription('The bot or its server has been forcefully shut down.\n')
            .setFooter({ text: 'Kalliope', iconURL: iconURL })
            .setColor([255, 0, 0])
        ]
      })
      playerPromises.push(player.destroy())
    })
    await Promise.allSettled(playerPromises)
    try {
      this.process?.kill()
    } catch {
      logging.warn('[Lavalink]  Failed to stop Lavalink service as it was likely already terminated.')
    }
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
    if (!me || !player) { return }

    // Client events
    if (newState.member?.id === me.id) {
      // Disconnect
      if (!newState.channelId) {
        await player.destroy()
        return
      }

      // Mute / Unmute
      if (oldState.serverMute !== newState.serverMute) {
        try {
          if (newState.serverMute) {
            await player.pause()
          } else {
            await player.resume()
          }
        } catch { /* Ignore play/pause error */ }
      }

      // Stage Channel
      if (newState.channel?.type === ChannelType.GuildStageVoice) {
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
            if (newState.suppress) {
              await player.pause()
            } else {
              await player.resume()
            }
          } catch { /* Ignore play/pause error */ }
          return
        }
      }
      return
    }

    // Channel empty
    if (!newState.channel) {
      const voiceChannel = this.client.channels.cache.get(oldState.channelId ?? '') as BaseGuildVoiceChannel | undefined
      if (voiceChannel?.members.filter((member) => member.id !== me.id).size === 0) {
        const textChannel = this.client.channels.cache.get(player.textChannelId ?? '') as GuildTextBasedChannel | undefined
        await textChannel?.send(simpleEmbed('ℹ️ Left the voice channel because it was empty.'))
        await player.destroy()
      }
      return
    }
  }

  /**
   * Gets a player using a guild ID.
   * @param guildId The guild ID to retrieve the player from.
   * @returns The Lavalink player for that guild ID or `null` if none exists.
   * @see LavalinkManager.getPlayer
   */
  getPlayer(guildId: string): Player | null {
    return this.manager.getPlayer(guildId) ?? null
  }

  /**
   * Creates a player from a discord.js interaction.
   * @returns The created Lavalink player.
   * @see LavalinkManager.createPlayer
   */
  createPlayer(guildId: string, voiceChannelId: string): Player
  createPlayer(interaction: ChatOrMenuInteraction & { member: { voice: { channel: string } } }): Player
  createPlayer(guildIdOrInteraction: string | ChatOrMenuInteraction & { member: { voice: { channel: string } } }, voiceChannelId?: string): Player {
    let playerOptions: PlayerOptions
    const defaultOptions: Partial<PlayerOptions> = {
      selfDeaf: false,
      volume: 50
    }
    if (typeof guildIdOrInteraction === 'string') {
      playerOptions = Object.assign(defaultOptions, { guildId: guildIdOrInteraction, voiceChannelId: voiceChannelId! })
    } else {
      playerOptions = Object.assign({
        guildId: guildIdOrInteraction.guild.id,
        voiceChannelId: guildIdOrInteraction.member.voice.channel.id,
        textChannelId: guildIdOrInteraction.channel!.id
      }, defaultOptions)
    }

    const player = this.manager.createPlayer(playerOptions)
    if (!player.get('plugins')?.extendedSearch) { new ExtendedSearch(player) }
    if (!player.get('plugins')?.customFilters) { new CustomFilters(player) }
    if (!player.get('collectors')) { player.set('collectors', []) }
    if (!player.get('settings')) {
      player.set('settings', { ...player.get('settings'), sponsorblock: true, sponsorblockSupport: true })
      player.setSponsorBlock(['music_offtopic']).catch(() => {
        logging.warn(`[Lavalink]  No SponsorBlock plugin available at Lavalink node '${player.node.id}'.`)
        player.set('settings', { ...player.get('settings'), sponsorblock: false, sponsorblockSupport: false })
      })
    }
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
      .setURL(info.uri ?? null)
      .setThumbnail(isTrack ? result.tracks[0].info.artworkUrl : result.playlist?.thumbnail ?? null)
      .addFields(isTrack ?
        [
          { name: 'Duration', value: durationOrLive(info), inline: true },
          { name: 'Author', value: info.author ?? 'Unknown author', inline: true },
          { name: 'Position', value: player.queue.tracks.length.toString(), inline: true }
        ] :
        [
          { name: 'Duration', value: msToHMS(info.duration), inline: true },
          { name: 'Amount', value: result.tracks.length + ' songs', inline: true },
          { name: 'Position', value: `${player.queue.tracks.length - result.tracks.length + 1}-${player.queue.tracks.length}`, inline: true }
        ])
      .setFooter({ text: `Kalliope | ${formatMusicFooter(player)}`, iconURL: this.client.user?.displayAvatarURL() })
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
