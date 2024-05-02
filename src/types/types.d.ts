import {
  Awaitable, ChatInputCommandInteraction, ClientEvents, GuildMember, SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder, User
} from 'discord.js'
import { TrackInfo } from 'lavalink-client'

interface CommandStructure {
  data: Omit<SlashCommandBuilder, 'addSubcommandGroup' | 'addSubcommand'> | SlashCommandSubcommandsOnlyBuilder,
  execute: (interaction: ChatInputCommandInteraction<'cached'>) => Awaitable<unknown>
}

interface EventStructure<E extends keyof ClientEvents> {
  data: { name: E, once?: boolean },
  execute: (...args: ClientEvents[E]) => Awaitable<void>
}

type Requester = GuildMember | User

type SpotifyTrackInfo = Pick<TrackInfo, 'title' | 'author' | 'duration' | 'artworkUrl' | 'uri'>

type ServerMessage = { type: 'requestPlayerData' | 'requestClientData' }
type UserMessage =
  { type: 'pause' | 'previous' | 'shuffle' | 'repeat' | 'autoplay' | 'sponsorblock' | 'clear' } |
  { type: 'skip' | 'remove', index: number } |
  { type: 'volume', volume: number } |
  { type: 'play', query: string, userId: string } |
  { type: 'filter', filter: string }
type WebSocketMessage = ServerMessage | UserMessage

type LavalinkYML = {
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
