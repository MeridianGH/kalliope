// noinspection NpmUsedModulesInstalled

import { spawn } from 'child_process'
import { EmbedBuilder } from 'discord.js'
import fs from 'fs'
import http from 'http'
import yaml from 'js-yaml'
import { LavalinkManager } from 'lavalink-client'
import { papisid, psid } from '../utilities/config.js'
import { logging } from '../utilities/logging.js'
import { errorEmbed, msToHMS, simpleEmbed } from '../utilities/utilities.js'
import { CustomFilters } from './customFilters.js'
import { ExtendedSearch } from './extendedSearch.js'

/**
 * A Lavalink manager that handles the Lavalink subprocess and initializes the lavalink-client manager.
 */
export class Lavalink {
  /**
   * Create a new Lavalink manager and attaches it to a discord.js client.
   * @param client {any} The discord.js client.
   */
  constructor(client) {
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
        setTimeout(() => { client.websocket?.updatePlayer(player) }, 500)
      })
      .on('queueEnd', (player) => {
        client.websocket?.updatePlayer(player)
        setTimeout(async () => { if (!player.playing && !player.queue.current) { await player.destroy() } }, 30000)
      })
      .on('trackStuck', (player) => {
        client.channels.cache.get(player.textChannelId)?.send(errorEmbed(`⏭️ Track **${player.current.info.title}** got stuck, skipping...`))
        player.skip()
      })
      .on('playerDestroy', (player) => {
        client.websocket.sendData('playerData', { guildId: player.guildId, player: null })
      })

    this.manager.nodeManager
      .on('connect', (node) => { logging.info(`[Lavalink]  Node ${node.id} connected.`) })
      .on('error', (node, error) => { logging.error(`[Lavalink]  Node ${node.id} encountered an error: ${error.message}`) })

    this.client
      .once('ready', () => { this.manager.init(client.user) })
      .on('voiceStateUpdate', (oldState, newState) => this._voiceUpdate(oldState, newState))
      .on('raw', (d) => this.manager.sendRawData(d))
  }

  /**
   * Initializes a Lavalink server by creating a subprocess. Exits the process if Lavalink fails to start.
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.manager.options.nodes.find((node) => node.host === 'localhost')) {
      return logging.info('[Lavalink]  No nodes with host \'localhost\' in LavalinkManagerOptions, skipping local Lavalink setup.')
    }

    const doc = yaml.load(fs.readFileSync('./music/lavalink/template.yml'), {})
    doc.lavalink.server.youtubeConfig = { PAPISID: papisid, PSID: psid }
    fs.writeFileSync('./music/lavalink/application.yml', yaml.dump(doc, {}))

    if (await this._portInUse(doc.server.port)) {
      logging.warn(`[Lavalink]  A server (possibly Lavalink) is already active on port ${doc.server.port}.`)
      logging.warn('[Lavalink]  Continuing, but expect errors if the server already running isn\'t Lavalink.')
      return
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        logging.error('[Lavalink]  Failed to start Lavalink within 30s.')
        process.exit()
      }, 30000)

      const lavalink = spawn('cd ./music/lavalink && java -jar Lavalink.jar', { shell: true })
      const onData = (data) => {
        data = data.toString().trim()
        if (data.includes('Undertow started')) {
          logging.success('[Lavalink]  Successfully started Lavalink.')
          lavalink.stdout.removeListener('data', onData)
          clearTimeout(timeout)
          resolve()
        } else if (data.toLowerCase().includes('failed')) {
          logging.error('[Lavalink]  Failed to start Lavalink.')
          lavalink.stdout.removeListener('data', onData)
          clearTimeout(timeout)
          process.exit()
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
   * @returns {Promise<boolean>} If the port is currently in use.
   * @private
   */
  _portInUse(port) {
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
   * @returns void
   * @private
   */
  async _voiceUpdate(oldState, newState) {
    const player = this.getPlayer(newState.guild.id)
    if (!player) { return }

    // Client events
    if (newState.guild.members.me.id === newState.member.id) {
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
      if (newState.channel.type === 'GUILD_STAGE_VOICE') {
        // Join
        if (!oldState.channel) {
          newState.guild.members.me.voice.setSuppressed(false).catch(async () => {
            if (!player.paused) { await player.pause() }
            await newState.guild.members.me.voice.setRequestToSpeak(true)
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
    if (newState.channel.members.size === 1) {
      await this.client.channels.cache.get(player.textChannelId)?.send(simpleEmbed('Left the voice channel because it was empty.'))
      await player.destroy()
    }
  }

  /**
   * Gets a player using a guild ID.
   * @param guildId The guild ID to retrieve the player from.
   * @returns The Lavalink player.
   * @see LavalinkManager.getPlayer
   */
  getPlayer(guildId) {
    // noinspection JSValidateTypes
    return this.manager.getPlayer(guildId)
  }

  /**
   * Creates a player from a discord.js interaction.
   * @param interaction The interaction that requested a player to be created.
   * @returns The created Lavalink player.
   * @see LavalinkManager.createPlayer
   */
  createPlayer(interaction) {
    const player = this.manager.createPlayer({
      guildId: interaction.guild.id,
      voiceChannelId: interaction.member.voice.channel.id,
      textChannelId: interaction.channel.id,
      selfDeaf: false,
      volume: 50
    })
    if (!player.get('plugins')?.extendedSearch) { new ExtendedSearch(player) }
    if (!player.get('plugins')?.customFilters) { new CustomFilters(player) }
    return player
  }

  /**
   * Processes and plays a search result.
   * Does no validity checks, make sure the provided data is a valid Player and SearchResult object.
   * @param player The player which processes this request.
   * @param result The previously acquired search result.
   * @return {Promise<EmbedBuilder>} The response embed used in the reply message.
   */
  async processPlayResult(player, result) {
    const isTrack = result.loadType === LoadTypes.track || result.loadType === LoadTypes.search
    const info = isTrack ? result.tracks[0].info : result.playlist

    await player.queue.add(isTrack ? result.tracks[0] : result.tracks)
    if (!player.playing && !player.paused) { await player.play() }

    // noinspection JSCheckFunctionSignatures
    return new EmbedBuilder()
      .setAuthor({ name: 'Added to queue.', iconURL: result.tracks[0].requester.displayAvatarURL() })
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
  }
}

/**
 * Enumeration for Lavalink load types.
 * @type {{search: string, playlist: string, track: string, error: string, empty: string}}
 */
export const LoadTypes = {
  track: 'track',
  playlist: 'playlist',
  search: 'search',
  error: 'error',
  empty: 'empty'
}

/**
 * Enumeration for Lavalink player states.
 * @type {{connected: string, disconnected: string, disconnecting: string, connecting: string, destroying: string}}
 */
export const PlayerStates = {
  connecting: 'CONNECTING',
  connected: 'CONNECTED',
  disconnecting: 'DISCONNECTING',
  disconnected: 'DISCONNECTED',
  destroying: 'DESTROYING'
}
