import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { simpleEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types.js'

export const { data, execute }: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pauses or resumes playback.'),
  async execute(interaction) {
    if (!genericChecks(interaction)) { return }
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    player.paused ? await player.resume() : await player.pause()
    await interaction.reply(simpleEmbed(player.paused ? '⏸️ Paused.' : '▶️ Resumed.'))
    interaction.client.websocket.updatePlayer(player)
  }
}
