import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { simpleEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types'

const command: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stops playback.'),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!genericChecks(interaction, player)) { return }

    await player.destroy()
    await interaction.reply(simpleEmbed('⏹️ Stopped.'))
    interaction.client.websocket?.clearPlayer(interaction.guild.id)
  }
}
export const { data, execute } = command
