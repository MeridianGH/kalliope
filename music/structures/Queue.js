export class Queue extends Array {
  constructor() {
    super()

    this.current = null
    this.previous = []
  }

  /**
   * Returns the total duration of the queue in milliseconds.
   * @returns {number}
   */
  get duration() {
    const current = this.current?.duration ?? 0
    // noinspection JSValidateTypes
    return this.reduce((acc, cur) => acc + (cur.duration || 0), current)
  }

  /**
   * Returns the total size of the queue, including the current track.
   * @returns {number}
   */
  get totalSize() {
    return this.length + this.current ? 1 : 0
  }

  /**
   * Adds a track to the queue at a specific position (offset).
   * @param track
   * @param offset {number}
   */
  add(track, offset = 0) {
    if (!this.current) {
      if (!Array.isArray(track)) {
        this.current = track
        return
      } else {
        this.current = (track = [...track]).shift()
      }
    }

    if (isNaN(offset) || offset < 0 || offset > this.length) {
      throw new RangeError(`Offset must be or between 0 and ${this.length}.`)
    }

    const tracks = track instanceof Array ? track : [track]
    this.splice(offset, 0, ...tracks)
  }

  /**
   * Removes a track from the queue and returns it.
   * @param position {number}
   * @returns {Object}
   */
  remove(position) {
    return this.splice(position, 1)[0]
  }

  /**
   * Clears the queue.
   */
  clear() {
    this.splice(0)
  }

  /**
   * Shuffles the queue.
   */
  shuffle() {
    for (let i = this.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this[i], this[j]] = [this[j], this[i]]
    }
  }
}
