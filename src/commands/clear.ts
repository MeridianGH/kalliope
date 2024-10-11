import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { simpleEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types'

const command: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clears the queue.'),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!genericChecks(interaction, player)) { return }

    player.queue.splice(0, player.queue.tracks.length)
    await interaction.reply(simpleEmbed('🗑️ Cleared the queue.'))
    interaction.client.websocket?.updatePlayer(player)
  }
}
export const { data, execute } = command
