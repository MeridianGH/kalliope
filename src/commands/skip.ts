import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { errorEmbed, simpleEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types'

const command: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skips the current track or to a specified point in the queue.')
    .addIntegerOption((option) => option.setName('track').setDescription('The track to skip to.')),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!genericChecks(interaction, player)) { return }

    const index = interaction.options.getInteger('track') ?? 0
    if (index > player.queue.tracks.length && player.queue.tracks.length > 0) { return await interaction.reply(errorEmbed(`You can only specify a song number between 1-${player.queue.tracks.length}.`)) }

    if (player.queue.tracks.length === 0) {
      if (player.get('settings').autoplay) {
        // await player.skip(0, false)
        await player.stopPlaying(false, true)
        await interaction.reply(simpleEmbed('⏭️ Skipped.'))
        interaction.client.websocket?.updatePlayer(player)
        return
      }
      await player.destroy()
      await interaction.reply(simpleEmbed('⏹️ Stopped.'))
      interaction.client.websocket?.clearPlayer(interaction.guild.id)
      return
    }

    if (index) {
      const track = player.queue.tracks[index - 1]
      await player.skip(index)
      await interaction.reply(simpleEmbed(`⏭️ Skipped to \`#${index}\`: **${track.info.title}**.`))
    } else {
      await player.skip()
      await interaction.reply(simpleEmbed('⏭️ Skipped.'))
    }
    interaction.client.websocket?.updatePlayer(player)
  }
}
export const { data, execute } = command
