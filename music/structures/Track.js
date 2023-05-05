export class Track {
  /** The base64 encoded track. */
  track
  /** The title of the track. */
  title
  /** The identifier of the track. */
  identifier
  /** The author of the track. */
  author
  /** The duration of the track. */
  duration
  /** If the track is seekable. */
  isSeekable
  /** If the track is a stream. */
  isStream
  /** The uri of the track. */
  uri
  /** The thumbnail of the track or null if it's an unsupported source. */
  thumbnail
  /** The user that requested the track. */
  requestedBy

  constructor(data, requestedBy) {
    this.track = data.track
    this.title = data.info.title
    this.identifier = data.info.identifier
    this.author = data.info.author
    this.duration = data.info.length
    this.isSeekable = data.info.isSeekable
    this.isStream = data.info.isStream
    this.uri = data.info.uri
    this.thumbnail = this.uri.includes('youtube') ? `https://img.youtube.com/vi/${this.identifier}/default.jpg` : null
    this.requestedBy = requestedBy
  }

  /**
   * Returns a specific thumbnail size (or null, if the source is not supported).
   * @param size {"maxresdefault" | "hqdefault" | "mqdefault" | "default"}
   * @returns {string | null}
   */
  displayThumbnail(size = 'default') {
    const finalSize = ['maxresdefault', 'hqdefault', 'mqdefault', 'default'].find((s) => s === size) ?? 'default'
    return this.uri.includes('youtube') ? `https://img.youtube.com/vi/${this.identifier}/${finalSize}.jpg` : null
  }
}
