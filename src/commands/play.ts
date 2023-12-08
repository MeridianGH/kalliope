import { SlashCommandBuilder } from 'discord.js'
import { loadChecks, playChecks } from '../utilities/checks.js'
import { addMusicControls, errorEmbed } from '../utilities/utilities.js'
import { SearchResult } from 'lavalink-client'
import { CommandStructure } from '../types/types.js'

export const { data, execute }: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Plays a song or playlist from YouTube.')
    .addStringOption((option) => option.setName('query').setDescription('The query to search for.').setRequired(true)),
  async execute(interaction) {
    if (!playChecks(interaction)) { return }
    await interaction.deferReply()

    const player = interaction.client.lavalink.createPlayer(interaction)
    const query = interaction.options.getString('query')
    const result = await player.search(query, interaction.member) as SearchResult
    if (!loadChecks(interaction, result)) { return }

    if (!player.connected) {
      if (interaction.inCachedGuild() && !interaction.member.voice.channel) {
        await player.destroy()
        return await interaction.editReply(errorEmbed('You need to be in a voice channel to use this command.'))
      }
      await player.connect()
    }

    const embed = await interaction.client.lavalink.processPlayResult(player, result)

    interaction.client.websocket.updatePlayer(player)
    const message = await interaction.editReply({ embeds: [embed] })
    await addMusicControls(message, player)
  }
}
