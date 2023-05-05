// noinspection JSUnresolvedVariable

import { spawn } from 'child_process'
import { Manager } from './structures/Manager.js'
import { Player } from './structures/Player.js'
import { simpleEmbed } from '../utilities/utilities.js'
import yaml from 'js-yaml'
import fs from 'fs'
import { papisid, psid } from '../utilities/config.js'
import http from 'http'
import { logging } from '../utilities/logging.js'

/**
 * The Lavalink manager. Handles the Lavalink subprocess and initializes the Lavacord manager.
 */
export class Lavalink {
  /**
   * Create a new Lavalink manager and attaches it to a discord.js client.
   * @param client {import("discord.js").Client}
   */
  constructor(client) {
    this.client = client
    this.manager = new Manager()
      .on('nodeCreate', (node) => { logging.info(`[Lavalink]  Node ${node.id} connected.`) })
      .on('nodeError', (node, error) => { logging.error(`[Lavalink]  Node ${node.id} encountered an error: ${error.message}`) })
      .on('trackStart', (player) => {
        setTimeout(() => { client.websocket?.updatePlayer(player) }, 500)
      })
      .on('trackEnd', (player, track) => {
        if (!player.previousTracks) { player.previousTracks = [] }
        player.previousTracks.push(track)
        player.previousTracks = player.previousTracks.slice(-11)
      })
      .on('queueEnd', (player) => {
        client.websocket?.updatePlayer(player)
        setTimeout(async () => { if (!player.playing && !player.queue.current) { await player.destroy() } }, 30000)
      })

    this.client.once('ready', () => { this.manager.init(client) })
    // this.client.on('voiceStateUpdate', (oldState, newState) => this._voiceUpdate(oldState, newState))
    this.client.on('raw', (d) => this.manager.updateVoiceState(d))
  }

  /**
   * Initializes a Lavalink server by creating a subprocess. Exits the process if Lavalink fails to start.
   * @returns {Promise<undefined>}
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

      // Muted
      if (oldState.serverMute !== newState.serverMute) {
        await player.pause(newState.serverMute)
      }

      // Stage Channel
      if (newState.channel.type === 'GUILD_STAGE_VOICE') {
        // Join
        if (!oldState.channel) {
          newState.guild.members.me.voice.setSuppressed(false).catch(async () => {
            await player.pause(true)
            await newState.guild.members.me.voice.setRequestToSpeak(true)
          })
          return
        }
        // Suppressed
        if (oldState.suppress !== newState.suppress) {
          await player.pause(newState.suppress)
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
   * @returns {Player | undefined}
   */
  getPlayer(guildId) {
    // noinspection JSValidateTypes
    return this.manager.players.get(guildId)
  }

  /**
   * Creates a player from a discord.js interaction.
   * @param interaction
   * @returns {Player}
   */
  createPlayer(interaction) {
    return this.manager.createPlayer({ guild: interaction.guild, voiceChannel: interaction.member.voice.channel, textChannel: interaction.channel })
  }
}
