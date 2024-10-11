import { Player, LavalinkFilterData } from 'lavalink-client'

const filterData = {
  none: {},
  bassboost: {
    equalizer: [
      { band: 0, gain: 0.6 },
      { band: 1, gain: 0.7 },
      { band: 2, gain: 0.8 },
      { band: 3, gain: 0.55 },
      { band: 4, gain: 0.25 },
      { band: 5, gain: 0 },
      { band: 6, gain: -0.25 },
      { band: 7, gain: -0.45 },
      { band: 8, gain: -0.55 },
      { band: 9, gain: -0.7 },
      { band: 10, gain: -0.3 },
      { band: 11, gain: -0.25 },
      { band: 12, gain: 0 },
      { band: 13, gain: 0 },
      { band: 14, gain: 0 }
    ]
  },
  classic: {
    equalizer: [
      { band: 0, gain: 0.375 },
      { band: 1, gain: 0.350 },
      { band: 2, gain: 0.125 },
      { band: 3, gain: 0 },
      { band: 4, gain: 0 },
      { band: 5, gain: 0.125 },
      { band: 6, gain: 0.550 },
      { band: 7, gain: 0.050 },
      { band: 8, gain: 0.125 },
      { band: 9, gain: 0.250 },
      { band: 10, gain: 0.200 },
      { band: 11, gain: 0.250 },
      { band: 12, gain: 0.300 },
      { band: 13, gain: 0.250 },
      { band: 14, gain: 0.300 }
    ]
  },
  eightd: { rotation: { rotationHz: 0.2 } },
  earrape: {
    equalizer: [
      { band: 0, gain: 0.6 },
      { band: 1, gain: 0.67 },
      { band: 2, gain: 0.67 },
      { band: 3, gain: 0 },
      { band: 4, gain: -0.5 },
      { band: 5, gain: 0.15 },
      { band: 6, gain: -0.45 },
      { band: 7, gain: 0.23 },
      { band: 8, gain: 0.35 },
      { band: 9, gain: 0.45 },
      { band: 10, gain: 0.55 },
      { band: 11, gain: 0.6 },
      { band: 12, gain: 0.55 },
      { band: 13, gain: 0 }
    ]
  },
  karaoke: {
    karaoke: {
      level: 1.0,
      monoLevel: 1.0,
      filterBand: 220.0,
      filterWidth: 100.0
    }
  },
  nightcore: {
    timescale: {
      speed: 1.3,
      pitch: 1.3
    }
  },
  superfast: {
    timescale: {
      speed: 1.3,
      pitch: 1.0
    }
  },
  vaporwave: {
    timescale: {
      speed: 0.85,
      pitch: 0.90
    }
  }
}

/**
 * A utility class that extends the Player with filter functionality.
 */
export class CustomFilters {
  static filterData: Record<keyof typeof filterData, LavalinkFilterData> = filterData

  private player: Player
  current: keyof typeof CustomFilters.filterData

  /**
   * Attaches this plugin to the player.
   * @param player The player to attach to.
   */
  constructor(player: Player) {
    this.player = player
    this.current = 'none'

    player.set('plugins', { ...player.get('plugins'), customFilters: true })
    player.set('filters', this)
  }

  /**
   * Sets and applies the current filter. Sets to `none` if not provided or available.
   * @param filter The filter to set.
   */
  async setFilter(filter: keyof typeof CustomFilters.filterData): Promise<void> {
    this.current = filter
    if (!CustomFilters.filterData[filter]) { this.current = 'none' }
    await this.player.node.updatePlayer({
      guildId: this.player.guildId,
      playerOptions: { filters: CustomFilters.filterData[this.current] }
    })
  }

  /**
   * The current playback timescale.
   * @returns The timescale percentage as float.
   */
  get timescale(): number {
    return CustomFilters.filterData[this.current].timescale?.speed ?? 1.0
  }
}
