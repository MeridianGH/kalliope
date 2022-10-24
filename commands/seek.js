import { SlashCommandBuilder } from 'discord.js'
import { errorEmbed, msToHMS, simpleEmbed, timeToMs } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Skips to the specified point in the current track.')
    .addStringOption((option) => option.setName('time').setDescription('The time to skip to. Can be seconds or HH:MM:SS.').setRequired(true)),
  async execute(interaction) {
    const time = timeToMs(interaction.options.getString('time'))
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!player || !player.queue.current) { return await interaction.reply(errorEmbed('Nothing currently playing.\nStart playback with `/play`!', true)) }
    if (interaction.member.voice.channel?.id !== player.voiceChannel) { return await interaction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true)) }
    if (player.queue.current.isStream) { return await interaction.reply(errorEmbed('You can\'t seek in a livestream!', true)) }
    if (time < 0 || time > player.queue.current.duration) { return await interaction.reply(errorEmbed(`You can only seek between 0:00-${player.queue.current.duration}!`, true)) }

    await player.seek(time)
    await interaction.reply(simpleEmbed('⏩ Skipped to ' + lang.other.response(msToHMS(time))))
    // Update Dashboard
  }
}
