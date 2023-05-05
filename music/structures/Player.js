/* eslint-disable camelcase */
import { Node } from './Node.js'
import { Queue } from './Queue.js'
import { Track } from './Track.js'

function check(options) {
  if (!options) { throw new TypeError('PlayerOptions must not be empty.') }

  if (!/^\d+$/.test(options.guild)) {
    throw new TypeError(
      'Player option "guild" must be present and be a non-empty string.'
    )
  }

  if (options.textChannel && !/^\d+$/.test(options.textChannel)) {
    throw new TypeError(
      'Player option "textChannel" must be a non-empty string.'
    )
  }

  if (options.voiceChannel && !/^\d+$/.test(options.voiceChannel)) {
    throw new TypeError(
      'Player option "voiceChannel" must be a non-empty string.'
    )
  }

  if (options.node && typeof options.node !== 'string') { throw new TypeError('Player option "node" must be a non-empty string.') }

  if (
    typeof options.volume !== 'undefined' &&
    typeof options.volume !== 'number'
  ) { throw new TypeError('Player option "volume" must be a number.') }

  if (
    typeof options.selfMute !== 'undefined' &&
    typeof options.selfMute !== 'boolean'
  ) { throw new TypeError('Player option "selfMute" must be a boolean.') }

  if (
    typeof options.selfDeafen !== 'undefined' &&
    typeof options.selfDeafen !== 'boolean'
  ) { throw new TypeError('Player option "selfDeafen" must be a boolean.') }
}

export class Player {
  /**
   * State enumeration.
   * @typedef {Player.states.connecting | Player.states.connected | Player.states.disconnecting | Player.states.disconnected | Player.states.destroying} States
   */
  static states = {
    connecting: 'CONNECTING',
    connected: 'CONNECTED',
    disconnecting: 'DISCONNECTING',
    disconnected: 'DISCONNECTED',
    destroying: 'DESTROYING'
  }
  /**
   * Repeat mode enumeration.
   * @typedef {Player.repeatModes.none | Player.repeatModes.trackRepeat | Player.repeatModes.queueRepeat} RepeatModes
   */
  static repeatModes = {
    none: 0,
    trackRepeat: 1,
    queueRepeat: 2
  }
  /**
   * The Manager new Players will use. Is set using Player#init().
   * @type {Manager}
   * @private
   */
  static _manager = null
  /**
   * The Manager managing this Player.
   * @type {Manager}
   */
  manager = null
  /**
   * The Node of this Player.
   * @type {Node}
   */
  node = null
  /**
   * The Queue of this Player.
   * @type {Queue}
   */
  queue = new Queue()
  /**
   * The guild this Player is playing in.
   * @type {import("discord.js").Guild}
   */
  guild = null
  /**
   * The current repeat mode.
   * @type {RepeatModes}
   */
  repeatMode = Player.repeatModes.none
  /**
   * The position in the track in milliseconds.
   * @type {number}
   */
  position = 0
  /**
   * Whether the Player is playing.
   * @type {boolean}
   */
  playing = false
  /**
   * Whether the Player is paused.
   * @type {boolean}
   */
  paused = false
  /**
   * The current volume.
   * @type {number}
   */
  volume = 50
  /**
   * The current voice channel.
   * @type {import("discord.js").VoiceBasedChannel}
   */
  voiceChannel = null
  /**
   * The current text channel.
   * @type {import("discord.js").GuildTextBasedChannel}
   */
  textChannel = null
  /**
   * The current state of the Player.
   * @type {States}
   */
  state = Player.states.disconnected
  /**
   * The equalizer bands array.
   * @type {Array}
   */
  bands = new Array(15).fill(0.0)
  /**
   * The current voice state of the Player.
   * @type {import("discord.js").VoiceState & Object}
   * @property {Object} event
   */
  voiceState = null

  /**
   * Sets a manager for all new players.
   * @param manager {Manager}
   * @hidden
   */
  static init(manager) {
    this._manager = manager
  }

  /**
   * Creates a new player or returns it if it already exists.
   * @param options
   */
  constructor(options) {
    this.options = options
    if (!this.manager) { this.manager = Player._manager }
    if (!this.manager) { throw new RangeError('Manager has not been initiated.') }

    if (this.manager.players.has(options.guild.id)) { return this.manager.players.get(options.guild.id) }

    this.guild = options.guild

    if (options.voiceChannel) { this.voiceChannel = options.voiceChannel }
    if (options.textChannel) { this.textChannel = options.textChannel }

    const node = this.manager.nodes.get(options.node)
    this.node = node ?? this.manager.leastLoadNodes.first()

    if (!this.node) { throw new RangeError('No available nodes.') }

    this.manager.players.set(options.guild.id, this)
    this.manager.emit('playerCreate', this)
    this.setVolume(options.volume ?? this.volume)
  }

  /**
   * Shorthand of Manager#search().
   * @see {@link Manager.search}
   */
  search(query, requestedBy) {
    return this.manager.search(query, requestedBy)
  }

  /**
   * Connect to the voice channel.
   * @return {Player}
   */
  connect() {
    if (!this.voiceChannel) { throw new RangeError('No voice channel has been set.') }
    this.state = Player.states.connecting

    console.log('connecting')
    this.guild.shard.send({
      op: 4,
      d: {
        guild_id: this.guild.id,
        channel_id: this.voiceChannel.id,
        self_mute: false,
        self_deaf: false
      }
    })

    this.state = Player.states.connected
    return this
  }

  /**
   * Disconnect from the voice channel.
   * @return {Player}
   */
  disconnect() {
    if (this.voiceChannel === null) { return this }
    this.state = Player.states.disconnecting

    this.pause(true)
    this.guild.shard.send({
      op: 4,
      d: {
        guild_id: this.guild.id,
        channel_id: null,
        self_mute: false,
        self_deaf: false
      }
    })

    this.voiceChannel = null
    this.state = Player.states.disconnected
    return this
  }

  /**
   * Destroys the player.
   */
  destroy() {
    this.state = Player.states.destroying

    this.disconnect()
    // noinspection JSIgnoredPromiseFromCall
    this.node.send({
      op: 'destroy',
      guildId: this.guild.id
    })

    this.manager.emit('playerDestroy', this)
    this.manager.players.delete(this.guild.id)
  }

  /**
   * Sets the Player's voice channel.
   * @param channel {import("discord.js").VoiceBasedChannel}
   * @return {Player}
   */
  setVoiceChannel(channel) {
    if (!channel.isVoiceBased()) { throw new TypeError('Channel must be a valid channel type.') }

    this.voiceChannel = channel
    this.connect()
    return this
  }

  /**
   * Sets the Player's text channel.
   * @param channel {import("discord.js").GuildTextBasedChannel}
   * @return {Player}
   */
  setTextChannel(channel) {
    if (!channel.isTextBased()) { throw new TypeError('Channel must be a valid channel type.') }

    this.textChannel = channel
    return this
  }

  /**
   * Queues and plays a track or resumes playback if none is provided.
   * @param [track] {Track}
   * @return {Promise<void>}
   */
  async play(track) {
    if (track && !(track instanceof Track)) { throw new TypeError('Track must be a valid track.') }

    if (!this.queue.current) {
      if (!track) { throw new RangeError('No current track.') }
      this.queue.current = track
    }

    await this.node.send({
      op: 'play',
      guildId: this.guild.id,
      track: this.queue.current.track
    })
  }

  /**
   * Sets the current volume.
   * @param volume {number}
   * @return {Player}
   */
  setVolume(volume) {
    volume = Number(volume)

    if (isNaN(volume)) { throw new TypeError('Volume must be a number.') }
    this.volume = Math.max(Math.min(volume, 1000), 0)

    // noinspection JSIgnoredPromiseFromCall
    this.node.send({
      op: 'volume',
      guildId: this.guild.id,
      volume: this.volume
    })

    return this
  }

  /**
   * Sets the repeat mode.
   * @param repeatMode {RepeatModes}
   * @return {Player}
   */
  setRepeatMode(repeatMode) {
    if (!Player.repeatModes[repeatMode]) { throw new TypeError('Repeat can only be one of Player#repeatModes.') }
    this.repeatMode = repeatMode

    return this
  }

  /**
   * Stops the current track. If amount is provided, stop the next n tracks as well.
   * @param [amount] {number}
   * @return {Player}
   */
  stop(amount) {
    if (typeof amount === 'number' && amount > 1) {
      this.queue.splice(0, amount) //TODO: Test if stop(2) plays 3rd track.
    }

    // noinspection JSIgnoredPromiseFromCall
    this.node.send({
      op: 'stop',
      guildId: this.guild.id
    })

    return this
  }

  /**
   * Pauses or resumes playback.
   * @param pause {boolean}
   * @return {Player}
   */
  pause(pause) {
    if (typeof pause !== 'boolean') { throw new RangeError('Pause can only be "true" or "false".') }

    // If already paused or the queue is empty do nothing.
    if (this.paused === pause || !this.queue.totalSize) { return this }

    this.playing = !pause
    this.paused = pause

    // noinspection JSIgnoredPromiseFromCall
    this.node.send({
      op: 'pause',
      guildId: this.guild.id,
      pause
    })

    return this
  }

  /**
   * Seeks to the position in milliseconds in the current track.
   * @param position
   * @return {Player}
   */
  seek(position) {
    if (!this.queue.current) { return undefined }
    position = Number(position)

    if (isNaN(position)) { throw new RangeError('Position must be a number.') }
    if (position < 0 || position > this.queue.current.duration) { position = Math.max(Math.min(position, this.queue.current.duration), 0) }

    this.position = position
    // noinspection JSIgnoredPromiseFromCall
    this.node.send({
      op: 'seek',
      guildId: this.guild.id,
      position
    })

    return this
  }
}
