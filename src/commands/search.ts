import {
  ActionRowBuilder,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction
} from 'discord.js'
import { loadChecks, playChecks } from '../utilities/checks.js'
import { addMusicControls, errorEmbed, formatMusicFooter, msToHMS } from '../utilities/utilities.js'
import { SearchResult, Track, UnresolvedTrack } from 'lavalink-client'
import { CommandStructure } from '../types/types.js'

export const { data, execute }: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Searches songs from YouTube and lets you select one to play.')
    .addStringOption((option) => option
      .setName('query')
      .setDescription('The query to search for.')
      .setRequired(true)
    ),
  async execute(interaction) {
    // noinspection DuplicatedCode
    if (!playChecks(interaction)) { return }
    await interaction.deferReply()

    const player = interaction.client.lavalink.createPlayer(interaction)
    const query = interaction.options.getString('query')
    const result = await player.extendedSearch(query, interaction.member) as SearchResult
    if (!loadChecks(interaction, result)) { return }

    const tracks = result.tracks.map((track: Track | UnresolvedTrack, index: number) => ({
      label: track.info.title,
      description: track.info.author,
      value: index.toString()
    }))

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('search')
      .setPlaceholder('Select a song...')
      .addOptions(...tracks)

    const embedMessage = await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setAuthor({ name: 'Search Results.', iconURL: interaction.member.displayAvatarURL() })
          .setTitle(`Here are the search results for your search\n"${query}":`)
          .setThumbnail(result.tracks[0].info.artworkUrl)
          .setFooter({
            text: 'Kalliope | This embed expires after one minute.',
            iconURL: interaction.client.user.displayAvatarURL()
          })
      ],
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(selectMenu)]
    })

    const collector = embedMessage
      .createMessageComponentCollector({
        time: 60000,
        filter: async (c) => {
          await c.deferUpdate()
          return c.user.id === interaction.user.id
        }
      })
    collector.on('collect', async (menuInteraction: StringSelectMenuInteraction) => {
      const track = result.tracks[Number(menuInteraction.values[0])]
      player.queue.add(track)
      if (!player.connected) {
        if (!interaction.member.voice.channel) {
          await player.destroy()
          await interaction.editReply(errorEmbed('You need to be in a voice channel to use this command.'))
          return
        }
        await player.connect()
      }
      if (!player.playing && !player.paused) { await player.play() }
      interaction.client.websocket.updatePlayer(player)

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
        .setFooter({ text: `Kalliope | ${formatMusicFooter(player)}`, iconURL: interaction.client.user.displayAvatarURL() })

      const message = await menuInteraction.editReply({ embeds: [embed], components: [] })
      collector.stop()
      await addMusicControls(message, player)
    })
  }
}
