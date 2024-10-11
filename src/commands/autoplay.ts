import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { simpleEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types'

const command: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Toggles autoplay. If enabled, automatically fetches new tracks when the queue ends.'),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!genericChecks(interaction, player)) { return }

    const settings = player.get('settings')
    settings.autoplay = !settings.autoplay
    player.set('settings', settings)
    await interaction.reply(simpleEmbed(`↩️ Autoplay: ${settings.autoplay ? 'Enabled ✅' : 'Disabled ❌'}`))
    interaction.client.websocket?.updatePlayer(player)
  }
}
export const { data, execute } = command
