import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { simpleEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types'

const command: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Sets the volume of the music player.')
    .addIntegerOption((option) => option.setName('volume').setDescription('The volume to set the player to.').setRequired(true).setMinValue(0).setMaxValue(100)),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!genericChecks(interaction, player)) { return }

    const volume = interaction.options.getInteger('volume', true)
    await player.setVolume(volume)
    await interaction.reply(simpleEmbed(`🔊 Set volume to ${volume}%.`))
    interaction.client.websocket?.updatePlayer(player)
  }
}
export const { data, execute } = command
