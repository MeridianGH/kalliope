import { SlashCommandBuilder } from 'discord.js'
import { loadChecks, playChecks } from '../utilities/checks.js'
import { addMusicControls, errorEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types'

const command: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Plays a song or playlist from YouTube.')
    .addStringOption((option) => option.setName('query').setDescription('The query to search for.').setRequired(true)),
  async execute(interaction) {
    if (!playChecks(interaction)) { return }
    await interaction.deferReply()

    const player = interaction.client.lavalink.createPlayer(interaction)
    const query = interaction.options.getString('query', true)
    const result = await player.extendedSearch(query, interaction.member)
    if (!loadChecks(interaction, result)) { return }

    if (!player.connected) {
      if (!interaction.member.voice.channel) {
        await player.destroy()
        await interaction.editReply(errorEmbed('You need to be in a voice channel to use this command.'))
        return
      }
      await player.connect()
    }

    const embed = await interaction.client.lavalink.processPlayResult(player, result)

    interaction.client.websocket?.updatePlayer(player)
    const message = await interaction.editReply({ embeds: [embed] })
    await addMusicControls(message, player)
  }
}
export const { data, execute } = command
