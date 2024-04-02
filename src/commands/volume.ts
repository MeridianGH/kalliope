import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { simpleEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types'

export const { data, execute }: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Sets the volume of the music player.')
    .addIntegerOption((option) => option.setName('volume').setDescription('The volume to set the player to.').setRequired(true)),
  async execute(interaction) {
    if (!genericChecks(interaction)) { return }
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    const volume = Math.min(Math.max(interaction.options.getInteger('volume'), 0), 100)
    await player.setVolume(volume)
    await interaction.reply(simpleEmbed(`🔊 Set volume to ${volume}%.`))
    interaction.client.websocket?.updatePlayer(player)
  }
}
