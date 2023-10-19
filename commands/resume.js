import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { errorEmbed, simpleEmbed } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resumes playback.'),
  async execute(interaction) {
    await genericChecks(interaction)
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    if (!player.paused) { return await interaction.reply(errorEmbed('The queue is not paused!', true)) }

    player.pause(false)
    await interaction.reply(simpleEmbed('▶ Resumed'))
    interaction.client.websocket.updatePlayer(player)
  }
}
