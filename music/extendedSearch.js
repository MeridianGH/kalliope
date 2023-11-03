import fetch from 'isomorphic-unfetch'
import spotifyUrlInfo from 'spotify-url-info'
import ytpl from 'ytpl'
import { LoadTypes } from './lavalink.js'

const spotify = spotifyUrlInfo(fetch)

/**
 * A utility class replacing the standard `Player.search` function
 * with one that provides more functionality.
 */
export class ExtendedSearch {
  /**
   * Attaches this plugin to the player.
   * @param player The player to attach to.
   */
  constructor(player) {
    this._search = player.search.bind(player)
    player.search = this.search.bind(this)
    player.set('plugins', { ...player.get('plugins'), extendedSearch: true })
  }

  /**
   * The improved version of `Player.search`.
   * Takes the same parameters and returns the same structure.
   * @param query {string} The query to search for.
   * @param requestedBy The member (or user) that requested this search.
   * @return {Promise<{Object}>} The search result.
   * @see Player.search
   */
  async search(query, requestedBy) {
    // Split off query parameters
    if (query.startsWith('https://')) { query = query.split('&')[0] }

    // YouTube Shorts
    const shortsRegex = /https:\/\/(www\.)?youtube\.com\/shorts\/(.*)$/
    if (query.match(shortsRegex)) { query = query.replace('shorts/', 'watch?v=') }

    // YouTube Playlists
    const playlistRegex = /https:\/\/(www\.)?youtube\.com\/playlist(.*)$/
    if (query.match(playlistRegex)) {
      try {
        const result = await this._search(query, requestedBy)
        const data = ytpl.validateID(query) ? await ytpl(query) : null
        result.playlist = Object.assign(result.playlist, { name: data.title, author: data.author.name, artworkUrl: data.bestThumbnail.url, uri: data.url })
        return result
      } catch (e) {
        return { loadType: LoadTypes.error, tracks: null, playlist: null, exception: { message: e.message, severity: 'common' }, pluginInfo: null }
      }
    }

    // Spotify
    const spotifyRegex = /(?:https:\/\/open\.spotify\.com\/|spotify:)(?:.+)?(track|playlist|album)[/:]([A-Za-z0-9]+)/
    const type = query.match(spotifyRegex)?.[1]
    try {
      switch (type) {
        case 'track': {
          const data = await this.getTrack(query, requestedBy)
          return { loadType: LoadTypes.track, tracks: data.tracks, playlist: null, exception: null, pluginInfo: null }
        }
        case 'playlist': {
          const data = await this.getPlaylist(query, requestedBy)
          return { loadType: LoadTypes.playlist, tracks: data.tracks, playlist: data.playlist, exception: null, pluginInfo: null }
        }
        case 'album': {
          const data = await this.getAlbumTracks(query, requestedBy)
          return { loadType: LoadTypes.playlist, tracks: data.tracks, playlist: data.playlist, exception: null, pluginInfo: null }
        }
      }
    } catch (e) {
      return { loadType: LoadTypes.error, tracks: null, playlist: null, exception: { message: e.message, severity: 'common' }, pluginInfo: null }
    }

    // Use best thumbnail available
    const search = await this._search(query, requestedBy)
    for (const track of search.tracks) { track.info.artworkUrl = await this.getBestThumbnail(track) }

    return search
  }

  /**
   * Resolves a single track on Spotify.
   * @param The Spotify URL to resolve.
   * @param requestedBy The member (or user) that requested this search.
   * @return {Promise<{tracks: (any)[]}>} The track result.
   */
  async getTrack(query, requestedBy) {
    const data = await spotify.getData(query, {})
    // noinspection JSUnresolvedVariable
    const track = {
      author: data.artists[0].name,
      duration: data.duration_ms,
      artworkUrl: data.coverArt?.sources[0]?.url,
      title: data.artists[0].name + ' - ' + data.name,
      uri: data.external_urls.spotify
    }
    return { tracks: [ await this.findClosestTrack(track, requestedBy) ] }
  }

  /**
   * Resolves a playlist on Spotify.
   * @param query The Spotify URL to resolve.
   * @param requestedBy The member (or user) that requested this search.
   * @return {Promise<{playlist: {author: string, artworkUrl: string, name: string, uri: string}, tracks: any[]}>} The playlist result.
   */
  async getPlaylist(query, requestedBy) {
    const data = await spotify.getData(query, {})
    // noinspection JSUnresolvedVariable
    const tracks = await Promise.all(data.tracks.items.map(
      async (playlistTrack) => await this.findClosestTrack({
        author: playlistTrack.track.artists[0].name,
        duration: playlistTrack.track.duration_ms,
        artworkUrl: playlistTrack.track.album?.images[0]?.url,
        title: playlistTrack.track.artists[0].name + ' - ' + playlistTrack.track.name,
        uri: playlistTrack.track.external_urls.spotify
      }, requestedBy))
    )
    // noinspection JSUnresolvedVariable
    return { tracks, playlist: { name: data.name, author: data.owner.display_name, artworkUrl: data.images[0]?.url, uri: data.external_urls.spotify } }
  }

  /**
   * Resolves tracks of an album on Spotify.
   * @param query The Spotify URL to resolve.
   * @param requestedBy The member (or user) that requested this search.
   * @return {Promise<{playlist: {thumbnail: string, author: string, name: string, uri: string}, tracks: any[]}>} The album result.
   */
  async getAlbumTracks(query, requestedBy) {
    const data = await spotify.getData(query, {})
    // noinspection JSUnresolvedVariable
    const tracks = await Promise.all(data.tracks.items.map(
      async (track) => await this.findClosestTrack({
        author: track.artists[0].name,
        duration: track.duration_ms,
        artworkUrl: data.images[0]?.url,
        title: track.artists[0].name + ' - ' + track.name,
        uri: track.external_urls.spotify
      }, requestedBy))
    )
    // noinspection JSUnresolvedVariable
    return { tracks, playlist: { name: data.name, author: data.artists[0].name, thumbnail: data.images[0]?.url, uri: data.external_urls.spotify } }
  }

  /**
   * Finds the closest matching track on YouTube based on a Spotify track.
   * @param data The Spotify track data.
   * @param requestedBy The member (or user) that requested this search.
   * @param [retries=5] {number} How often to retry.
   * @return {Promise<any>} The most closely matching track.
   */
  async findClosestTrack(data, requestedBy, retries = 5) {
    if (retries <= 0) { return }
    const tracks = (await this.search(data.title, requestedBy)).tracks.slice(0, 5)
    const track =
      tracks.find((track) => track.title.toLowerCase().includes('official audio')) ??
      tracks.find((track) => track.duration >= data.duration - 1500 && track.duration <= data.duration + 1500) ??
      tracks.find((track) => track.author.endsWith('- Topic') || track.author === data.author) ??
      tracks[0]
    if (!track) { return await this.findClosestTrack(data, requestedBy, retries - 1) }
    const { author, title, thumbnail, uri } = data
    Object.assign(track, { author, title, thumbnail, uri })
    return track
  }

  /**
   * Finds the best available thumbnail of a track on YouTube.
   * @param track The track of which to get the thumbnail.
   * @return {Promise<string>} The URL of the thumbnail image.
   */
  async getBestThumbnail(track) {
    for (const size of ['maxresdefault', 'hqdefault', 'mqdefault', 'default']) {
      const thumbnail = `https://i.ytimg.com/vi/${track.id}/${size}.jpg`
      if ((await fetch(thumbnail)).ok) { return thumbnail }
    }
    return track.info.artworkUrl
  }
}
