import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { errorEmbed, simpleEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types'

const command: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('sponsorblock')
    .setDescription('Toggles SponsorBlock. If enabled, automatically skip non-music segments in tracks.'),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!genericChecks(interaction, player)) { return }

    const settings = player.get('settings')
    if (!settings.sponsorblockSupport) {
      return await interaction.reply(errorEmbed('SponsorBlock is not supported on this player.', true))
    }

    settings.sponsorblock = !settings.sponsorblock
    player.set('settings', settings)
    await player.setSponsorBlock(settings.sponsorblock ? ['music_offtopic'] : [])
    await interaction.reply(simpleEmbed(`⏭️ SponsorBlock: ${settings.sponsorblock ? 'Enabled ✅' : 'Disabled ❌'}`))
    interaction.client.websocket?.updatePlayer(player)
  }
}
export const { data, execute } = command
