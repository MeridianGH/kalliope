import { ActionRowBuilder, EmbedBuilder, SelectMenuBuilder, SlashCommandBuilder } from 'discord.js'
import { PlayerStates } from '../music/lavalink.js'
import { loadChecks, playChecks } from '../utilities/checks.js'
import { addMusicControls, errorEmbed, msToHMS } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Searches five songs from YouTube and lets you select one to play.')
    .addStringOption((option) => option.setName('query').setDescription('The query to search for.').setRequired(true)),
  async execute(interaction) {
    if (!playChecks(interaction)) { return }
    await interaction.deferReply()

    const player = interaction.client.lavalink.createPlayer(interaction)
    const query = interaction.options.getString('query')
    const result = await player.search(query, interaction.member)
    if (!loadChecks(interaction, result)) { return }

    const tracks = result.tracks.slice(0, 5).map((track, index) => ({ label: track.info.title, description: track.info.author, value: index.toString() }))

    const selectMenu = new SelectMenuBuilder()
      .setCustomId('search')
      .setPlaceholder('Select a song...')
      .addOptions(...tracks)

    // noinspection JSCheckFunctionSignatures
    const embedMessage = await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setAuthor({ name: 'Search Results.', iconURL: interaction.member.displayAvatarURL() })
          .setTitle(`Here are the search results for your search\n"${query}":`)
          .setThumbnail(result.tracks[0].info.artworkUrl)
          .setFooter({ text: 'Kalliope | This embed expires after one minute.', iconURL: interaction.client.user.displayAvatarURL() })
      ],
      components: [new ActionRowBuilder().setComponents(selectMenu)]
    })

    const collector = embedMessage.createMessageComponentCollector({ time: 60000, filter: async (c) => { await c.deferUpdate(); return c.user.id === interaction.user.id } })
    collector.on('collect', async (menuInteraction) => {
      const track = result.tracks[Number(menuInteraction.values[0])]
      player.queue.add(track)
      if (player.state !== PlayerStates.connected) {
        if (!interaction.member.voice.channel) {
          await player.destroy()
          return await interaction.editReply(errorEmbed('You need to be in a voice channel to use this command.'))
        }
        await player.connect()
      }
      if (!player.playing && !player.paused) { await player.play() }
      interaction.client.websocket.updatePlayer(player)

      // noinspection JSCheckFunctionSignatures
      const embed = new EmbedBuilder()
        .setAuthor({ name: 'Added to queue.', iconURL: interaction.member.displayAvatarURL() })
        .setTitle(track.info.title)
        .setURL(track.info.uri)
        .setThumbnail(track.info.artworkUrl)
        .addFields([
          { name: 'Duration', value: track.info.isStream ? '🔴 Live' : msToHMS(track.info.duration), inline: true },
          { name: 'Author', value: track.info.author, inline: true },
          { name: 'Position', value: player.queue.tracks.length.toString(), inline: true }
        ])
        .setFooter({ text: 'Kalliope', iconURL: interaction.client.user.displayAvatarURL() })

      const message = await menuInteraction.editReply({ embeds: [embed], components: [] })
      collector.stop()
      await addMusicControls(message, player)
    })
  }
}
