import { PermissionsBitField } from 'discord.js'
import { LoadTypes } from '../music/lavalink.js'
import { errorEmbed } from './utilities.js'

/**
 * Executes generic music checks on an interaction and replies based on possible errors.
 * @param interaction
 * @returns {Promise<any>}
 */
export async function genericChecks(interaction) {
  const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
  if (!player || !player.queue.current) { return await interaction.reply(errorEmbed('Nothing currently playing.\nStart playback with `/play`!', true)) }
  if (interaction.member.voice.channel?.id !== player.voiceChannelId) { return await interaction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true)) }
}

/**
 * Executes playback checks and replies based on possible errors.
 * @param interaction
 * @returns {Promise<any>}
 */
export async function playChecks(interaction) {
  const channel = interaction.member.voice.channel
  if (!channel) { return await interaction.reply(errorEmbed('You need to be in a voice channel to use this command.', true)) }
  if (interaction.guild.members.me.voice.channel && channel !== interaction.guild.members.me.voice.channel) { return await interaction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true)) }
  if (!interaction.guild.members.me.permissionsIn(channel).has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak])) { return await interaction.reply(errorEmbed('The bot does not have the correct permissions to play in your voice channel!', true)) }
}

/**
 * Executes Lavalink load type checks and replies based on possible errors.
 * @param interaction
 * @param result
 * @returns {Promise<any>}
 */
export async function loadChecks(interaction, result) {
  if (result.loadType === LoadTypes.error) { return await interaction.editReply(errorEmbed('There was an error while adding your song to the queue.')) }
  if (result.loadType === LoadTypes.empty) { return await interaction.editReply(errorEmbed('There were no tracks found using your query.')) }

}
