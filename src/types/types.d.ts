import {
  Awaitable, ChatInputCommandInteraction, ClientEvents, GuildMember, SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder, User
} from 'discord.js'

interface CommandStructure {
  data: Omit<SlashCommandBuilder, 'addSubcommandGroup' | 'addSubcommand'> | SlashCommandSubcommandsOnlyBuilder,
  execute: (interaction: ChatInputCommandInteraction<'cached'>) => Awaitable<unknown>
}

interface EventStructure<E extends keyof ClientEvents> {
  data: { name: E, once?: boolean },
  execute: (...args: ClientEvents[E]) => Awaitable<void>
}

type Requester = GuildMember | User
