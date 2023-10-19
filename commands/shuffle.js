import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { simpleEmbed } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffles the queue.'),
  async execute(interaction) {
    await genericChecks(interaction)
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    await player.queue.shuffle()
    await interaction.reply(simpleEmbed('🔀 Shuffled the queue.'))
    interaction.client.websocket.updatePlayer(player)
  }
}
