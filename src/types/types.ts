import {
  Awaitable,
  ChatInputCommandInteraction,
  ClientEvents,
  ContextMenuCommandBuilder,
  ContextMenuCommandInteraction,
  GuildMember,
  SlashCommandOptionsOnlyBuilder,
  User
} from 'discord.js'
import { TrackInfo } from 'lavalink-client'

export type DistributedOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never

export type CommandStructure = {
  data: SlashCommandOptionsOnlyBuilder,
  execute: (interaction: ChatInputCommandInteraction<'cached'>) => Awaitable<unknown>
}
export type ContextMenuStructure = {
  data: ContextMenuCommandBuilder,
  execute: (interaction: ContextMenuCommandInteraction<'cached'>) => Awaitable<unknown>
}
export type EventStructure<E extends keyof ClientEvents> = {
  data: { name: E, once?: boolean },
  execute: (...args: ClientEvents[E]) => Awaitable<void>
}

export type ChatOrMenuInteraction = ChatInputCommandInteraction<'cached'> | ContextMenuCommandInteraction<'cached'>

export type Requester = GuildMember | User

export type SpotifyTrackInfo = Pick<TrackInfo, 'title' | 'author' | 'duration' | 'artworkUrl' | 'uri'>

export type SimplePlayer = {
  guildId: string,
  voiceChannelId: string | null,
  textChannelId: string | null,
  paused: boolean,
  volume: number,
  position: number,
  repeatMode: 'queue' | 'track' | 'off',
  settings: {
    autoplay?: boolean,
    sponsorblock: boolean,
    sponsorblockSupport: boolean
  },
  queue: {
    tracks: SimpleTrack[],
    current: SimpleTrack & { segments: [{ start: number, end: number }] | null }
  },
  filters: {
    current: string,
    timescale: number
  }
}

export type SimpleTrack = {
  info: {
    identifier: string,
    title: string,
    author: string,
    duration: number,
    artworkUrl: string | null,
    uri: string,
    sourceName: 'youtube' | 'youtubemusic' | 'soundcloud' | 'bandcamp' | 'twitch',
    isSeekable: boolean,
    isStream: boolean,
    isrc: string | null
  },
  requester: {
    displayName: string,
    displayAvatarURL: string
  }
}

export type LavalinkYML = {
  server: { port: number },
  lavalink: {
    server: {
      youtubeConfig: {
        PAPISID: string,
        PSID: string
      }
    }
  }
}
