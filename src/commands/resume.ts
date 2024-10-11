import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { errorEmbed, simpleEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types'

const command: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resumes playback.'),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!genericChecks(interaction, player)) { return }

    if (!player.paused) { return await interaction.reply(errorEmbed('The queue is not paused!', true)) }

    await player.pause()
    await interaction.reply(simpleEmbed('▶️ Resumed'))
    interaction.client.websocket?.updatePlayer(player)
  }
}
export const { data, execute } = command
