import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { simpleEmbed } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pauses or resumes playback.'),
  async execute(interaction) {
    await genericChecks(interaction)
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    player.paused ? await player.resume() : await player.pause()
    await interaction.reply(simpleEmbed(player.paused ? '⏸ Paused.' : '▶ Resumed.'))
    interaction.client.websocket.updatePlayer(player)
  }
}
