import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { simpleEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types'

export const { data, execute }: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Toggles autoplay. If enabled, automatically fetches new tracks when the queue ends.'),
  async execute(interaction) {
    if (!genericChecks(interaction)) { return }
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    const settings = player.get('settings')
    settings.autoplay = !settings.autoplay
    player.set('settings', settings)
    await interaction.reply(simpleEmbed(`↩️ Autoplay: ${settings.autoplay ? 'Enabled ✅' : 'Disabled ❌'}`))
    interaction.client.websocket?.updatePlayer(player)
  }
}
