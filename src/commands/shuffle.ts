import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { simpleEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types'

const command: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffles the queue.'),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!genericChecks(interaction, player)) { return }

    await player.queue.shuffle()
    await interaction.reply(simpleEmbed('🔀 Shuffled the queue.'))
    interaction.client.websocket?.updatePlayer(player)
  }
}
export const { data, execute } = command
