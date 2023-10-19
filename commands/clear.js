import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { simpleEmbed } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clears the queue.'),
  async execute(interaction) {
    await genericChecks(interaction)
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    player.queue.splice(0, player.queue.tracks.length)
    await interaction.reply(simpleEmbed('🗑️ Cleared the queue.'))
    interaction.client.websocket.updatePlayer(player)
  }
}
