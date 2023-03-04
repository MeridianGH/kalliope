import { SlashCommandBuilder } from 'discord.js'
import { errorEmbed, simpleEmbed } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resumes playback.'),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!player || !player.queue.current) { return await interaction.reply(errorEmbed('Nothing currently playing.\nStart playback with `/play`!', true)) }
    if (interaction.member.voice.channel?.id !== player.voiceChannel) { return await interaction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true)) }
    if (!player.paused) { return await interaction.reply(errorEmbed('The queue is not paused!', true)) }

    player.pause(false)
    await interaction.reply(simpleEmbed('▶ Resumed'))
    interaction.client.websocket?.updatePlayer(player)
  }
}
