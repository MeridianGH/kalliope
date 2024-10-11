import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js'
import { LoadTypes } from '../music/lavalink.js'
import { errorEmbed } from './utilities.js'
import { SearchResult, Player, Track } from 'lavalink-client'
import { logging } from './logging.js'
import { ChatOrMenuInteraction } from '../types/types.js'

/**
 * Executes generic music checks on an interaction and replies based on possible errors.
 * @param interaction The interaction that called this check.
 * @param player The player to check.
 * @returns If the checks succeeded or not.
 */
export function genericChecks(interaction: ChatInputCommandInteraction<'cached'>, player: Player | null): player is Player & { queue: { current: Track } } {
  if (!player?.queue.current) {
    void interaction.reply(errorEmbed('Nothing currently playing.\nStart playback with `/play`!', true))
    return false
  }
  if (interaction.member.voice.channel?.id !== player.voiceChannelId) {
    void interaction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true))
    return false
  }
  return true
}

/**
 * Executes playback checks and replies based on possible errors.
 * @param interaction The interaction that called this check.
 * @param interaction.member The member that instantiated the interaction.
 * @returns If the checks succeeded or not.
 */
export function playChecks(interaction: ChatOrMenuInteraction): interaction is ChatOrMenuInteraction & { member: { voice: { channel: string } } } {
  const channel = interaction.member.voice.channel
  if (!channel) {
    void interaction.reply(errorEmbed('You need to be in a voice channel to use this command.', true))
    return false
  }
  if (interaction.guild.members.me?.voice.channel && channel !== interaction.guild.members.me.voice.channel) {
    void interaction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true))
    return false
  }
  if (!interaction.guild.members.me?.permissionsIn(channel).has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak])) {
    void interaction.reply(errorEmbed('The bot does not have the correct permissions to play in your voice channel!\nMake sure it is able to connect to and speak in your channel.', true))
    return false
  }
  if (interaction.channel && !interaction.guild.members.me.permissionsIn(interaction.channel).has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions])) {
    void interaction.reply(errorEmbed('The bot does not have the correct permissions for this text channel!\nMake sure it can send and react to messages in this channel.', true))
    return false
  }
  return true
}

/**
 * Executes Lavalink load type checks and replies based on possible errors.
 * @param interaction The interaction that called this check.
 * @param result The search result to check.
 * @returns If the checks succeeded or not.
 */
export function loadChecks(interaction: ChatOrMenuInteraction, result: SearchResult): boolean {
  if (result.loadType === LoadTypes.error) {
    logging.warn(`[Lavalink]  Encountered error while loading track: ${result.exception?.message}`)
    void interaction.editReply(errorEmbed('There was an error while adding your track to the queue.'))
    return false
  }
  if (result.loadType === LoadTypes.empty) {
    void interaction.editReply(errorEmbed('There were no tracks found using your query.'))
    return false
  }
  return true
}
