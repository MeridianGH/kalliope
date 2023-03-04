import { SlashCommandBuilder } from 'discord.js'
import { errorEmbed, simpleEmbed } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skips the current track or to a specified point in the queue.')
    .addIntegerOption((option) => option.setName('track').setDescription('The track to skip to.')),
  async execute(interaction) {
    const index = interaction.options.getInteger('track')
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!player || !player.queue.current) { return await interaction.reply(errorEmbed('Nothing currently playing.\nStart playback with `/play`!', true)) }
    if (interaction.member.voice.channel?.id !== player.voiceChannel) { return await interaction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true)) }
    if (index > player.queue.length && player.queue.length > 0) { return await interaction.reply(errorEmbed(`You can only specify a song number between 1-${player.queue.length}.`)) }

    if (player.queue.length === 0) {
      player.destroy()
      await interaction.reply(simpleEmbed('⏹ Stopped.'))
      interaction.client.websocket?.updatePlayer(player)
      return
    }

    if (index) {
      const track = player.queue[index - 1]
      player.stop(index)
      await interaction.reply(simpleEmbed(`⏭ Skipped to \`#${index}\`: **${track.title}**.`))
    } else {
      player.stop()
      await interaction.reply(simpleEmbed('⏭ Skipped.'))
    }
    interaction.client.websocket?.updatePlayer(player)
  }
}
