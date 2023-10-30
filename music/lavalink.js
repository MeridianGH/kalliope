// noinspection JSUnresolvedVariable, NpmUsedModulesInstalled

import { spawn } from 'child_process'
import fs from 'fs'
import http from 'http'
import yaml from 'js-yaml'
import { LavalinkManager } from 'lavalink-client'
import { papisid, psid } from '../utilities/config.js'
import { logging } from '../utilities/logging.js'
import { errorEmbed, simpleEmbed } from '../utilities/utilities.js'
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
        {
          host: 'localhost',
          port: 2333,
          authorization: 'youshallnotpass'
        }
      ],
      sendToShard: (guildId, payload) => client.guilds.cache.get(guildId)?.shard?.send(payload),
      queueOptions: { maxPreviousTracks: 10 }
    })

    this.manager
      .on('trackStart', (player) => {
        setTimeout(() => { client.websocket?.updatePlayer(player) }, 500)
      })
      /*.on('trackEnd', (player, track) => {
        if (!player.previousTracks) { player.previousTracks = [] }
        player.previousTracks.push(track)
        player.previousTracks = player.previousTracks.slice(-11)
      })*/
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
    const doc = yaml.load(fs.readFileSync('./music/lavalink/template.yml'), {})
    doc.lavalink.server.youtubeConfig.PAPISID = papisid
    doc.lavalink.server.youtubeConfig.PSID = psid
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
   * @param port
   * @returns {Promise<boolean>}
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
   * @param oldState
   * @param newState
   * @returns {void}
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
      player.textChannel.send(simpleEmbed('Left the voice channel because it was empty.'))
      await player.destroy()
    }
  }

  /**
   * Gets a player using a guild ID.
   * @param guildId
   * @returns {import('lavalink-client/dist/cjs/structures/Player.d.ts').Player | undefined}
   * @see LavalinkManager.getPlayer
   */
  getPlayer(guildId) {
    // noinspection JSValidateTypes
    return this.manager.getPlayer(guildId)
  }

  /**
   * Creates a player from a discord.js interaction.
   * @param interaction
   * @returns {import('lavalink-client/dist/cjs/structures/Player.d.ts').Player}
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
