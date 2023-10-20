import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { simpleEmbed } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stops playback.'),
  async execute(interaction) {
    await genericChecks(interaction)
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    player.destroy()
    await interaction.reply(simpleEmbed('⏹️ Stopped.'))
    interaction.client.websocket.updatePlayer(player)
  }
}
