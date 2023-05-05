/* eslint-disable no-async-promise-executor */
import { EventEmitter } from 'events'
import { ChannelType, Collection, VoiceState } from 'discord.js'
import { Node } from './Node.js'
import { Track } from './Track.js'
import { Player } from './Player.js'

export class Manager extends EventEmitter {
  static DEFAULT_SOURCES = {
    'youtube music': 'ytmsearch',
    youtube: 'ytsearch',
    soundcloud: 'scsearch'
  }

  /**
   * The Client that instantiated this Manager.
   * @type {import("discord.js").Client}
   */
  client = null
  /**
   * The map of players.
   * @type {Collection.<string, Player>}
   */
  players = new Collection()
  /**
   * The map of nodes.
   * @type {Collection.<any, Node>}
   */
  nodes = new Collection()
  /**
   * Whether the Manager has been initiated or not.
   * @type {boolean}
   */
  initiated = false

  /**
   * Returns the least used Nodes.
   * @returns {Collection<any, Node>}
   */
  get leastUsedNodes() {
    return this.nodes
      .filter((node) => node.connected)
      .sort((a, b) => b.calls - a.calls)
  }

  /**
   * Returns the least system load Nodes.
   * @returns {Collection<any, Node>}
   */
  get leastLoadNodes() {
    return this.nodes
      .filter((node) => node.connected)
      .sort((a, b) => {
        const aload = a.stats.cpu
          ? a.stats.cpu.systemLoad / a.stats.cpu.cores * 100
          : 0
        const bload = b.stats.cpu
          ? b.stats.cpu.systemLoad / b.stats.cpu.cores * 100
          : 0
        return aload - bload
      })
  }

  /**
   * Creates a new manager.
   */
  constructor() {
    super()

    Player.init(this)
    Node.init(this)

    this.options = {
      nodes: [
        {
          host: 'localhost',
          port: 2333,
          password: 'youshallnotpass'
        }
      ],
      shards: 1,
      clientName: 'Kalliope',
      defaultSearchPlatform: 'youtube'
    }

    if (this.options.nodes) { for (const nodeOptions of this.options.nodes) { new Node(nodeOptions) } }
  }

  /**
   * Initializes the Manager.
   * @param client {import("discord.js").Client} The client to attach to.
   * @returns {Manager}
   */
  init(client) {
    if (this.initiated) { return this }
    this.options.clientId = client.user?.id ?? this.options.clientId
    this.client = client

    if (typeof this.options.clientId !== 'string') { throw new TypeError('"clientId" is not of type "string".') }

    for (const node of this.nodes.values()) {
      try {
        node.connect()
      } catch (err) {
        this.emit('nodeError', node, err)
      }
    }

    this.initiated = true
    return this
  }

  /**
   * Searches the enabled sources based off the URL or the `source` property.
   * @param query {string} The search query.
   * @param requestedBy {import("discord.js").GuildMember} The user that started the search.
   * @returns {Promise<any>}
   */
  search(query, requestedBy) {
    return new Promise(async (resolve, reject) => {
      const node = this.leastUsedNodes.first()
      if (!node) { throw new Error('No available nodes.') }

      const _query = typeof query === 'string' ? { query } : query
      const _source =
        Manager.DEFAULT_SOURCES[
          _query.source ?? this.options.defaultSearchPlatform
        ] ?? _query.source

      let search = _query.query
      if (!/^https?:\/\//.test(search)) {
        search = `${_source}:${search}`
      }

      const res = await node.makeRequest(`/loadtracks?identifier=${encodeURIComponent(search)}`).catch((err) => reject(err))

      if (!res) { return reject(new Error('Query not found.')) }

      const result = {
        loadType: res.loadType,
        exception: res.exception ?? null,
        tracks: res.tracks?.map((track) => new Track(track, requestedBy)) ?? []
      }

      if (result.loadType === 'PLAYLIST_LOADED') {
        result.playlist = {
          name: res.playlistInfo.name,
          selectedTrack:
            res.playlistInfo.selectedTrack === -1 ? null : new Track(res.tracks[res.playlistInfo.selectedTrack], requestedBy),
          duration: result.tracks.reduce(
            (acc, cur) => acc + (cur.duration || 0),
            0
          )
        }
      }

      return resolve(result)
    })
  }

  /**
   * Decodes the base64 encoded tracks and returns a TrackData array.
   * @param tracks
   * @returns {Promise<any>}
   */
  decodeTracks(tracks) {
    return new Promise(async (resolve, reject) => {
      const node = this.nodes.first()
      if (!node) { throw new Error('No available nodes.') }
      if (!(tracks instanceof Array)) { tracks = [tracks] }

      const res = await node.makeRequest('/decodetracks', (r) => {
        r.method = 'POST'
        r.body = JSON.stringify(tracks)
        r.headers['Content-Type'] = 'application/json'
      }).catch((err) => reject(err))

      if (!res) { return reject(new Error('No data returned from query.')) }

      return resolve(res)
    })
  }

  /**
   * Creates a player or returns one if it already exists.
   * @param options {Object}
   * @returns {Player}
   */
  createPlayer(options) {
    if (this.players.has(options.guild.id)) { return this.players.get(options.guild.id) }
    return new Player(options)
  }

  /**
   * Returns a player or undefined if it does not exist.
   * @param guild {string}
   * @returns {Player}
   */
  getPlayer(guild) {
    return this.players.get(guild)
  }

  /**
   * Destroys a player if it exists.
   * @param guild {string}
   */
  destroyPlayer(guild) {
    this.players.delete(guild)
  }

  /**
   * Sends voice data to the Lavalink server.
   * @param payload {Object} Raw discord.js payload.
   */
  async updateVoiceState(payload) {
    if ('t' in payload && !['VOICE_STATE_UPDATE', 'VOICE_SERVER_UPDATE'].includes(payload.t)) { return }

    const data = payload.d ?? payload
    if (!data || !('token' in data) && !('session_id' in data)) { return }

    const player = this.players.get(data.guild_id)
    if (!player) { return }

    if ('token' in data) {
      // VoiceServer Update
      player.voiceState.event = data
    } else {
      // VoiceState Update
      const voiceState = new VoiceState(player.guild, data)
      voiceState.op = 'voiceUpdate'
      voiceState.guildId = data.guild_id
      if (voiceState.id !== this.options.clientId) { return }

      // Set pause status
      player.pause(voiceState.serverMute)

      if (voiceState.channel?.id) {
        // Stage Channel
        if (voiceState.channel.type === ChannelType.GuildStageVoice) {
          if (!player.voiceState.channel) {
            // Join
            voiceState.guild.members.me.voice.setSuppressed(false).catch(async () => {
              await player.pause(true)
              await voiceState.guild.members.me.voice.setRequestToSpeak(true)
            })
          } else if (player.voiceState.suppress !== voiceState.suppress) {
            // Suppressed
            await player.pause(voiceState.suppress)
          }
        }

        // Updated voice state
        player.voiceState = voiceState
        player.voiceChannel = voiceState.channel
      } else {
        // Disconnected
        player.destroy()
      }
    }

    if ('event' in player.voiceState && 'sessionId' in player.voiceState) {
      await player.node.send(player.voiceState).catch((e) => { console.log(e) })
    }
  }
}
