import { WebSocket } from 'ws'
import { Pool } from 'undici'

function check(options) {
  if (!options) { throw new TypeError('NodeOptions must not be empty.') }

  if (typeof options.host !== 'string' || !/.+/.test(options.host)) {
    throw new TypeError(
      'Node option "host" must be present and be a non-empty string.'
    )
  }

  if (typeof options.port !== 'undefined' && typeof options.port !== 'number') { throw new TypeError('Node option "port" must be a number.') }

  if (
    typeof options.password !== 'undefined' &&
    (typeof options.password !== 'string' || !/.+/.test(options.password))
  ) { throw new TypeError('Node option "password" must be a non-empty string.') }

  if (
    typeof options.secure !== 'undefined' &&
    typeof options.secure !== 'boolean'
  ) { throw new TypeError('Node option "secure" must be a boolean.') }

  if (
    typeof options.identifier !== 'undefined' &&
    typeof options.identifier !== 'string'
  ) { throw new TypeError('Node option "identifier" must be a non-empty string.') }

  if (
    typeof options.retryAmount !== 'undefined' &&
    typeof options.retryAmount !== 'number'
  ) { throw new TypeError('Node option "retryAmount" must be a number.') }

  if (
    typeof options.retryDelay !== 'undefined' &&
    typeof options.retryDelay !== 'number'
  ) { throw new TypeError('Node option "retryDelay" must be a number.') }

  if (
    typeof options.requestTimeout !== 'undefined' &&
    typeof options.requestTimeout !== 'number'
  ) { throw new TypeError('Node option "requestTimeout" must be a number.') }
}

export class Node {
  /**
   * The Manager new Nodes will use. Is set using Node#init().
   * @type {Manager}
   * @private
   */
  static _manager = null
  /**
   * The Manager managing this Node.
   * @type {Manager}
   */
  manager = null
  /**
   * The WebSocket between the Node and Lavalink.
   * @type {import("ws").WebSocket}
   */
  socket = null
  /**
   * The amount of calls this Node has made.
   * @type {number}
   */
  calls = 0
  /**
   * This Node's current reconnect attempts.
   * @type {number}
   */
  reconnectAttempts = 1

  /**
   * Sets a manager for all new nodes.
   * @param manager {Manager}
   * @hidden
   */
  static init(manager) {
    this._manager = manager
  }

  /**
   * Creates a new Node or returns it if it already exists.
   * @param options
   */
  constructor(options) {
    this.options = options
    if (!this.manager) { this.manager = Node._manager }
    if (!this.manager) { throw new RangeError('Manager has not been initiated.') }

    if (this.manager.nodes.has(options.identifier || options.host)) {
      return this.manager.nodes.get(options.identifier || options.host)
    }

    check(options)

    this.options = {
      port: 2333,
      password: 'youshallnotpass',
      secure: false,
      retryAmount: 5,
      retryDelay: 30e3,
      ...options
    }

    if (this.options.secure) { this.options.port = 443 }

    this.http = new Pool(`http${this.options.secure ? 's' : ''}://${this.address}`)

    this.options.identifier = options.identifier || options.host
    this.stats = {
      players: 0,
      playingPlayers: 0,
      uptime: 0,
      memory: {
        free: 0,
        used: 0,
        allocated: 0,
        reservable: 0
      },
      cpu: {
        cores: 0,
        systemLoad: 0,
        lavalinkLoad: 0
      },
      frameStats: {
        sent: 0,
        nulled: 0,
        deficit: 0
      }
    }

    this.manager.nodes.set(this.options.identifier, this)
  }

  /**
   * Returns if the Node is connected.
   * @returns {boolean}
   */
  get connected() {
    if (!this.socket) { return false }
    return this.socket.readyState === WebSocket.OPEN
  }

  /**
   * Returns the address for this node.
   * @returns {string}
   */
  get address() {
    return `${this.options.host}:${this.options.port}`
  }

  /**
   * Connects to the Node.
   */
  connect() {
    if (this.connected) { return }

    this.socket = new WebSocket(`ws${this.options.secure ? 's' : ''}://${this.address}`, {
      headers: {
        Authorization: this.options.password,
        'Num-Shards': String(this.manager.options.shards),
        'User-Id': this.manager.options.clientId,
        'Client-Name': this.manager.options.clientName
      }
    })
    this.socket.on('open', this._onOpen.bind(this))
    this.socket.on('close', this._onClose.bind(this))
    this.socket.on('message', this._onMessage.bind(this))
    this.socket.on('error', this._onError.bind(this))

    this.manager.emit('nodeConnect', this)
  }

  /**
   * Destroys the Node and all its players.
   */
  destroy() {
    if (!this.connected) { return }

    const players = this.manager.players.filter((p) => p.node === this)
    if (players.size) { players.forEach((p) => p.destroy()) }

    this.socket.close(1000, 'destroy')
    this.socket.removeAllListeners()
    this.socket = null

    this.reconnectAttempts = 1
    clearTimeout(this.reconnectTimeout)

    this.manager.emit('nodeDestroy', this)
    this.manager.nodes.delete(this.options.identifier)
  }

  /**
   * Makes an API call to the Node.
   * @param endpoint {String} The endpoint to make the call to.
   * @param [modify] {function} Callback to modify the request.
   * @returns {any} The requested data.
   */
  async makeRequest(endpoint, modify) {
    const options = {
      path: `/${endpoint.replace(/^\//gm, '')}`,
      method: 'GET',
      headers: { Authorization: this.options.password },
      headersTimeout: this.options.requestTimeout
    }

    modify?.(options)

    const request = await this.http.request(options)
    this.calls++

    return await request.body.json()
  }

  /**
   * Sends data to the Node.
   * @param data {Object}
   * @return {Promise<Object | void>} A Promise that rejects with error data on failure and resolves on success.
   */
  send(data) {
    return new Promise((resolve, reject) => {
      if (!this.connected) { reject() }
      if (!data || !JSON.stringify(data).startsWith('{')) { reject() }

      console.log(JSON.stringify(data))
      this.socket.send(JSON.stringify(data), (error) => {
        error ? reject(error) : resolve()
      })
    })
  }

  /**
   * Reconnects the Node after a connection failure.
   */
  reconnect() {
    this.reconnectTimeout = setTimeout(() => {
      if (this.reconnectAttempts >= this.options.retryAmount) {
        const error = new Error(`Unable to connect after ${this.options.retryAmount} attempts.`)
        this.manager.emit('nodeError', this, error)
        return this.destroy()
      }
      this.socket.removeAllListeners()
      this.socket = null

      this.manager.emit('nodeReconnect', this)
      this.connect()

      this.reconnectAttempts++
    }, this.options.retryDelay)
  }

  /**
   * Handles the 'open' event of the underlying WebSocket.
   * @private
   */
  _onOpen() {
    console.log('open')
    if (this.reconnectTimeout) { clearTimeout(this.reconnectTimeout) }
    this.manager.emit('nodeConnect', this)
  }

  /**
   * Handles the 'close' event of the underlying WebSocket.
   * @param code {number} The close reason code.
   * @param reason {String} The close reason as text.
   * @private
   */
  _onClose(code, reason) {
    console.log(`close: ${code}, ${reason}`)
    this.manager.emit('nodeDisconnect', this, { code, reason })
    if (code !== 1000 || reason !== 'destroy') { this.reconnect() }
  }

  /**
   * Handles the 'error' event of the underlying WebSocket.
   * @param error {Error} The encountered error.
   * @private
   */
  _onError(error) {
    if (!error) { return }
    this.manager.emit('nodeError', this, error)
  }

  /**
   * Handles the 'message' event of the underlying WebSocket.
   * @param d {Object} The received data.
   * @private
   */
  _onMessage(d) {
    if (Array.isArray(d)) { d = Buffer.concat(d) } else if (d instanceof ArrayBuffer) { d = Buffer.from(d) }

    const payload = JSON.parse(d.toString())

    if (!payload.op) { return }
    this.manager.emit('nodeRaw', payload)

    let player
    switch (payload.op) {
      case 'stats':
        delete payload.op
        this.stats = { ...payload }
        break
      case 'playerUpdate':
        player = this.manager.players.get(payload.guildId)
        if (player) { player.position = payload.state.position || 0 }
        break
      case 'event':
        this._handleEvent(payload)
        break
      default:
        console.log('unknown opcode', payload.op)
        // this.manager.emit('nodeError', this, new Error(`Unexpected op "${payload.op}" with data: ${payload}`))
        break
    }
  }

  /**
   * Handles a Lavalink event.
   * @param payload {Object} The received event data.
   * @private
   */
  _handleEvent(payload) {
    if (!payload.guildId) { return }

    const player = this.manager.players.get(payload.guildId)
    if (!player) { return }

    const track = player.queue.current
    const type = payload.type

    if (payload.type === 'TrackStartEvent') {
      this.trackStart(player, track, payload)
    } else if (payload.type === 'TrackEndEvent') {
      this.trackEnd(player, track, payload)
    } else if (payload.type === 'TrackStuckEvent') {
      this.trackStuck(player, track, payload)
    } else if (payload.type === 'TrackExceptionEvent') {
      this.trackError(player, track, payload)
    } else if (payload.type === 'WebSocketClosedEvent') {
      this.socketClosed(player, payload)
    } else {
      const error = new Error(`Node#event unknown event '${type}'.`)
      this.manager.emit('nodeError', this, error)
    }
  }

  /**
   * Handles a trackStart event.
   * @param player {Player}
   * @param track {Track}
   * @param payload {Object}
   */
  trackStart(player, track, payload) {
    player.playing = true
    player.paused = false
    this.manager.emit('trackStart', player, track, payload)
  }

  trackEnd(player, track, payload) {
    // If a track had an error while starting
    if (['LOAD_FAILED', 'CLEAN_UP'].includes(payload.reason)) {
      player.queue.previous = player.queue.current
      player.queue.current = player.queue.shift()

      if (!player.queue.current) { return this.queueEnd(player, track, payload) }

      this.manager.emit('trackEnd', player, track, payload)
      return
    }

    // If a track was forcibly played
    if (payload.reason === 'REPLACED') {
      this.manager.emit('trackEnd', player, track, payload)
      return
    }

    // If a track ended and is track repeating
    if (track && player.trackRepeat) {
      if (payload.reason === 'STOPPED') {
        player.queue.previous = player.queue.current
        player.queue.current = player.queue.shift()
      }

      if (!player.queue.current) { return this.queueEnd(player, track, payload) }

      this.manager.emit('trackEnd', player, track, payload)
      return
    }

    // If a track ended and is track repeating
    if (track && player.queueRepeat) {
      player.queue.previous = player.queue.current

      if (payload.reason === 'STOPPED') {
        player.queue.current = player.queue.shift()
        if (!player.queue.current) { return this.queueEnd(player, track, payload) }
      } else {
        player.queue.add(player.queue.current)
        player.queue.current = player.queue.shift()
      }

      this.manager.emit('trackEnd', player, track, payload)
      return
    }

    // If there is another song in the queue
    if (player.queue.length) {
      player.queue.previous = player.queue.current
      player.queue.current = player.queue.shift()

      this.manager.emit('trackEnd', player, track, payload)
      return
    }

    // If there are no songs in the queue
    if (!player.queue.length) { return this.queueEnd(player, track, payload) }
  }

  queueEnd(player, track, payload) {
    player.queue.current = null
    player.playing = false
    this.manager.emit('queueEnd', player, track, payload)
  }

  trackStuck(player, track, payload) {
    player.stop()
    this.manager.emit('trackStuck', player, track, payload)
  }

  trackError(player, track, payload) {
    player.stop()
    this.manager.emit('trackError', player, track, payload)
  }

  socketClosed(player, payload) {
    this.manager.emit('socketClosed', player, payload)
  }
}
