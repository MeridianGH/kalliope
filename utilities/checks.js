import { PermissionsBitField } from 'discord.js'
import { LoadTypes } from '../music/lavalink.js'
import { errorEmbed } from './utilities.js'

/**
 * Executes generic music checks on an interaction and replies based on possible errors.
 * @param interaction The interaction that called this check.
 * @returns {boolean} If the checks succeeded or not.
 */
export function genericChecks(interaction) {
  const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
  if (!player || !player.queue.current) {
    interaction.reply(errorEmbed('Nothing currently playing.\nStart playback with `/play`!', true))
    return false
  }
  if (interaction.member.voice.channel?.id !== player.voiceChannelId) {
    interaction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true))
    return false
  }
  return true
}

/**
 * Executes playback checks and replies based on possible errors.
 * @param interaction The interaction that called this check.
 * @returns {boolean} If the checks succeeded or not.
 */
export function playChecks(interaction) {
  const channel = interaction.member.voice.channel
  if (!channel) {
    interaction.reply(errorEmbed('You need to be in a voice channel to use this command.', true))
    return false
  }
  if (interaction.guild.members.me.voice.channel && channel !== interaction.guild.members.me.voice.channel) {
    interaction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true))
    return false
  }
  if (!interaction.guild.members.me.permissionsIn(channel).has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak])) {
    interaction.reply(errorEmbed('The bot does not have the correct permissions to play in your voice channel!\nMake sure it is able to connect to and speak in your channel.', true))
    return false
  }
  if (!interaction.guild.members.me.permissionsIn(interaction.channel).has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions])) {
    interaction.reply(errorEmbed('The bot does not have the correct permissions for this text channel!\nMake sure it can send and react to messages in this channel.', true))
    return false
  }
  return true
}

/**
 * Executes Lavalink load type checks and replies based on possible errors.
 * @param interaction The interaction that called this check.
 * @param result The result to check.
 * @returns {boolean} If the checks succeeded or not.
 */
export function loadChecks(interaction, result) {
  if (result.loadType === LoadTypes.error) {
    // noinspection JSIgnoredPromiseFromCall
    interaction.editReply(errorEmbed('There was an error while adding your song to the queue.'))
    return false
  }
  if (result.loadType === LoadTypes.empty) {
    // noinspection JSIgnoredPromiseFromCall
    interaction.editReply(errorEmbed('There were no tracks found using your query.'))
    return false
  }
  return true
}
