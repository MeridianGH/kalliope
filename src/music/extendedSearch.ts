import fetch from 'node-fetch'
import spotifyUrlInfo from 'spotify-url-info'
import { LoadTypes } from './lavalink.js'
import { Player, SearchResult, Track } from 'lavalink-client'
import { Requester, SpotifyTrackInfo } from '../types/types'
import { logging } from '../utilities/logging.js'

const spotify = spotifyUrlInfo(fetch)

/**
 * A utility class replacing the standard `Player.search` function
 * with one that provides more functionality.
 */
export class ExtendedSearch {
  private readonly _search: Player['search']
  /**
   * Attaches this plugin to the player.
   * @param player The player to attach to.
   */
  constructor(player: Player) {
    this._search = player.search.bind(player)
    player.search = this.search.bind(this)
    player.set('plugins', { ...player.get<Player['plugins']>('plugins'), extendedSearch: true })
  }

  /**
   * The improved version of `Player.search`.
   * Takes the same parameters and returns the same structure.
   * @param query The query to search for.
   * @param requestedBy The member (or user) that requested this search.
   * @returns The search result.
   * @see Player.search
   */
  async search(query: string, requestedBy: Requester): Promise<SearchResult> {
    // Split off query parameters
    if (query.startsWith('https://')) { query = query.split('&')[0] }

    // YouTube Shorts
    const shortsRegex = /https:\/\/(www\.)?youtube\.com\/shorts\/(.*)$/
    if (query.match(shortsRegex)) { query = query.replace('shorts/', 'watch?v=') }

    // YouTube Playlists
    const playlistRegex = /https:\/\/(www\.)?youtube\.com\/playlist(.*)$/
    if (query.match(playlistRegex)) {
      try {
        const result = await this._search(query, requestedBy) as SearchResult
        result.playlist = {
          ...result.playlist,
          thumbnail: await this.getBestThumbnail(result.tracks[0]),
          uri: query,
          duration: result.tracks.map((track) => track.info.duration).reduce((acc, cur) => acc + cur)
        }
        return result
      } catch (e) {
        return { loadType: LoadTypes.error, tracks: null, playlist: null, exception: { message: e.message, cause: 'Search Error', severity: 'COMMON' }, pluginInfo: null }
      }
    }

    // Spotify
    const spotifyRegex = /(?:https:\/\/open\.spotify\.com\/|spotify:)(.+)?(track|playlist|album)[/:]([A-Za-z0-9]+)/
    const type = query.match(spotifyRegex)?.[2]
    const locale = query.match(spotifyRegex)?.[1]
    if (locale) { query = query.replace(locale, '') }
    try {
      if (type === 'track') {
        const track = await this.getSpotifyTrack(query, requestedBy)
        return {
          loadType: LoadTypes.track,
          tracks: [track],
          playlist: null,
          exception: null,
          pluginInfo: null
        }
      } else if (type === 'playlist' || type === 'album') {
        const { tracks, playlist } = await this.getSpotifyPlaylist(query, requestedBy)
        return {
          loadType: 'playlist',
          tracks: tracks,
          playlist: playlist,
          exception: null,
          pluginInfo: null
        }
      }
    } catch (e) {
      return { loadType: LoadTypes.error, tracks: null, playlist: null, exception: { message: e.message, cause: 'Search Error', severity: 'COMMON' }, pluginInfo: null }
    }

    // Use best thumbnail available
    const search = await this._search(query, requestedBy) as SearchResult
    for (const track of search.tracks) {
      track.info.artworkUrl = await this.getBestThumbnail(track)
      track.requester = requestedBy
    }

    return search
  }

  /**
   * Resolves a single track on Spotify.
   * @param query The Spotify URL to resolve.
   * @param requestedBy The member (or user) that requested this search.
   * @returns The track result.
   */
  async getSpotifyTrack(query: string, requestedBy: Requester): Promise<Track> {
    const data = await spotify.getData(query, {})
    logging.debug('track', data)
    const trackData: SpotifyTrackInfo = {
      title: data.artists[0].name + ' - ' + data.name,
      author: data.artists[0].name,
      duration: data.duration,
      artworkUrl: data.coverArt?.sources[0]?.url,
      uri: this.spotifyURIToLink(data.uri)
    }
    return await this.findClosestTrack(trackData, requestedBy)
  }

  /**
   * Resolves a playlist on Spotify.
   * @param query The Spotify URL to resolve.
   * @param requestedBy The member (or user) that requested this search.
   * @returns The playlist result.
   */
  async getSpotifyPlaylist(query: string, requestedBy: Requester): Promise<Pick<SearchResult, 'tracks' | 'playlist'>> {
    const data = await spotify.getData(query, {})
    logging.debug('playlist', data)
    const tracks = await Promise.all(
      data.trackList.map((trackData) => this.getSpotifyTrack(trackData.uri, requestedBy))
    )
    return {
      tracks: tracks,
      playlist: {
        name: data.title,
        title: data.title,
        author: data.subtitle,
        uri: this.spotifyURIToLink(data.uri),
        thumbnail: data.coverArt?.sources[0]?.url,
        selectedTrack: tracks[0],
        duration: tracks.map((track) => track.info.duration).reduce((acc, cur) => acc + cur)
      }
    }
  }

  /**
   * Finds the closest matching track on YouTube based on a Spotify track.
   * @param data The Spotify track data.
   * @param requestedBy The member (or user) that requested this search.
   * @param [retries] How often to retry.
   * @returns The most closely matching track.
   */
  async findClosestTrack(data: SpotifyTrackInfo, requestedBy: Requester, retries: number = 5): Promise<Track> {
    if (retries <= 0) { return null }
    const tracks = (await this.search(data.title, requestedBy)).tracks.slice(0, 10 - retries)
    const track =
      tracks.find((track) => track.info.title.toLowerCase().includes('official audio')) ??
      tracks.find((track) => track.info.duration >= data.duration - 1500 && track.info.duration <= data.duration + 1500) ??
      tracks.find((track) => track.info.author.endsWith('- Topic') || track.info.author === data.author) ??
      tracks[0]
    if (!track) { return await this.findClosestTrack(data, requestedBy, retries - 1) }
    track.info = { ...track.info, ...data }
    track.pluginInfo = { ...track.pluginInfo, uri: track.info.uri }
    return track
  }

  /**
   * Converts a Spotify URI to a valid link.
   * @param uri The spotify URI.
   * @returns The valid https link.
   */
  spotifyURIToLink(uri: string): string {
    return uri.replaceAll(':', '/').replace('spotify', 'https://open.spotify.com')
  }

  /**
   * Finds the best available thumbnail of a track on YouTube.
   * @param track The track of which to get the thumbnail.
   * @returns The URL of the thumbnail image.
   */
  async getBestThumbnail(track: Track): Promise<string> {
    for (const size of ['maxresdefault', 'hqdefault', 'mqdefault', 'default']) {
      const thumbnail = `https://i.ytimg.com/vi/${track.info.identifier}/${size}.jpg`
      if ((await fetch(thumbnail)).ok) { return thumbnail }
    }
    return track.info.artworkUrl
  }
}
