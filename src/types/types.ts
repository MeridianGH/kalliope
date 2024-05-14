import {
  Awaitable,
  ChatInputCommandInteraction,
  ClientEvents,
  ContextMenuCommandBuilder,
  ContextMenuCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  User
} from 'discord.js'
import { TrackInfo } from 'lavalink-client'

export interface CommandStructure {
  data: Omit<SlashCommandBuilder, 'addSubcommandGroup' | 'addSubcommand'> | SlashCommandSubcommandsOnlyBuilder,
  execute: (interaction: ChatInputCommandInteraction<'cached'>) => Awaitable<unknown>
}
export interface ContextMenuStructure {
  data: ContextMenuCommandBuilder,
  execute: (interaction: ContextMenuCommandInteraction<'cached'>) => Awaitable<unknown>
}

export interface EventStructure<E extends keyof ClientEvents> {
  data: { name: E, once?: boolean },
  execute: (...args: ClientEvents[E]) => Awaitable<void>
}

export type Requester = GuildMember | User

export type SpotifyTrackInfo = Pick<TrackInfo, 'title' | 'author' | 'duration' | 'artworkUrl' | 'uri'>

interface ClientMessageOptions {
  playerData: {
    guildId: string,
    player: SimplePlayer,
    responseTo?: {
      type: keyof Omit<UserMessageOptions, 'requestPlayerData' | 'requestClientData'>,
      userId: string
    }
  },
  clientData: {
    guilds: string[],
    users: number,
    readyTimestamp: EpochTimeStamp,
    ping: number,
    displayAvatarURL: string,
    displayName: string,
    version: string
  }
}
export type ClientMessageTypes = keyof ClientMessageOptions
export type ClientMessage<T extends ClientMessageTypes = ClientMessageTypes> = { type: T, clientId: string } & ClientMessageOptions[T]

interface UserMessageOptions {
  requestPlayerData: { clientId: string },
  requestClientData: { clientId: string },
  pause: unknown,
  previous: unknown,
  shuffle: unknown,
  repeat: unknown,
  autoplay: unknown,
  sponsorblock: unknown,
  clear: unknown,
  skip: { index?: number },
  remove: { index: number },
  volume: { volume: number },
  play: { query: string },
  filter: { filter: string }
}
type UserMessageTypes = keyof UserMessageOptions
export type WebSocketMessage<T extends UserMessageTypes = UserMessageTypes> = T extends UserMessageTypes ? { type: T, guildId: string, userId: string } & UserMessageOptions[T] : never

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
  server: {
    port: number
  },
  lavalink: {
    server: {
      youtubeConfig: {
        PAPISID: string,
        PSID: string
      }
    }
  }
}
