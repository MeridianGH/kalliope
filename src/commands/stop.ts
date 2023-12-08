import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { simpleEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types.js'

export const { data, execute }: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stops playback.'),
  async execute(interaction) {
    if (!genericChecks(interaction)) { return }
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    await player.destroy()
    await interaction.reply(simpleEmbed('⏹️ Stopped.'))
  }
}
