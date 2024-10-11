import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { simpleEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types'

const command: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('repeat')
    .setDescription('Sets the current repeat mode.')
    .addStringOption((option) => option.setName('mode').setDescription('The mode to set.').setRequired(true).addChoices(
      { name: 'Off', value: 'off' },
      { name: 'Track', value: 'track' },
      { name: 'Queue', value: 'queue' }
    )),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!genericChecks(interaction, player)) { return }

    const mode = interaction.options.getString('mode') as 'off' | 'track' | 'queue'
    await player.setRepeatMode(mode)
    await interaction.reply(simpleEmbed(`Set repeat mode to ${player.repeatMode === 'queue' ? 'Queue 🔁' : player.repeatMode === 'track' ? 'Track 🔂' : 'Off ▶️'}`))
    interaction.client.websocket?.updatePlayer(player)
  }
}
export const { data, execute } = command
