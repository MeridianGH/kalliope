import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { simpleEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types'

const command: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pauses or resumes playback.'),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!genericChecks(interaction, player)) { return }

    if (player.paused) {
      await player.resume()
    } else {
      await player.pause()
    }
    await interaction.reply(simpleEmbed(player.paused ? '⏸️ Paused.' : '▶️ Resumed.'))
    interaction.client.websocket?.updatePlayer(player)
  }
}
export const { data, execute } = command
