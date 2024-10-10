import { Client, CollectedInteraction, Collection, InteractionCollector } from 'discord.js'
import { Lavalink } from '../music/lavalink.js'
import { WebSocketConnector } from '../utilities/websocket.js'
import { CustomFilters } from '../music/customFilters.js'
import { CommandStructure, ContextMenuStructure, Requester } from './types'
import { levels } from '../utilities/logging.js'
import { SearchResult, Track, UnresolvedTrack } from 'lavalink-client'

declare global {
  namespace NodeJS {
    // noinspection JSUnusedGlobalSymbols
    interface ProcessEnv {
      [key: string]: string | undefined,
      DISCORD_TOKEN: string,
      DISCORD_APP_ID: string,
      GENIUS_CLIENT_TOKEN: string,
      YOUTUBE_PAPISID: string,
      YOUTUBE_PSID: string,
      LOGGING_LEVEL: keyof typeof levels
    }
  }
}

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, CommandStructure>,
    contextMenus: Collection<string, ContextMenuStructure>
    lavalink: Lavalink,
    websocket?: WebSocketConnector
  }
}

interface CustomPlayerProperties {
  plugins: {
    extendedSearch: boolean,
    customFilters: boolean
  },
  settings: {
    autoplay: boolean,
    sponsorblock: boolean,
    sponsorblockSupport: boolean
  }
  filters: CustomFilters,
  collectors: InteractionCollector<CollectedInteraction>[]
}

declare module 'lavalink-client' {
  // noinspection JSUnusedGlobalSymbols
  interface Player {
    extendedSearch: (query: string, requester: Requester) => Promise<SearchResult>,
    executeAutoplay: (client: Client, lastTrack: Track | UnresolvedTrack) => Promise<void>,
    get<K extends keyof CustomPlayerProperties>(key: K): CustomPlayerProperties[K],
    set<K extends keyof CustomPlayerProperties>(key: K, value: CustomPlayerProperties[K]): void
  }
}
