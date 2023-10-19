import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { LoadTypes } from '../music/lavalink.js'
import { loadChecks, playChecks } from '../utilities/checks.js'
import { addMusicControls, errorEmbed, msToHMS } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Plays a song or playlist from YouTube.')
    .addStringOption((option) => option.setName('query').setDescription('The query to search for.').setRequired(true)),
  async execute(interaction) {
    await playChecks(interaction)
    await interaction.deferReply()

    const player = interaction.client.lavalink.createPlayer(interaction)
    const query = interaction.options.getString('query')
    const result = await player.search(query, interaction.member)
    await loadChecks(interaction, result)

    if (!player.connected) {
      if (!interaction.member.voice.channel) {
        await player.destroy()
        return await interaction.editReply(errorEmbed('You need to be in a voice channel to use this command.'))
      }
      await player.connect()
    }

    const isTrack = result.loadType === LoadTypes.track || result.loadType === LoadTypes.search
    const info = isTrack ? result.tracks[0].info : result.playlist

    await player.queue.add(isTrack ? result.tracks[0] : result.tracks)
    if (!player.playing && !player.paused) { await player.play() }
    interaction.client.websocket.updatePlayer(player)

    // noinspection JSUnresolvedVariable, JSCheckFunctionSignatures
    const embed = new EmbedBuilder()
      .setAuthor({ name: 'Added to queue.', iconURL: interaction.member.user.displayAvatarURL() })
      .setTitle(info.title)
      .setURL(info.uri)
      .setThumbnail(info.artworkUrl)
      .addFields(isTrack ? [
        { name: 'Duration', value: info.isStream ? '🔴 Live' : msToHMS(info.duration), inline: true },
        { name: 'Author', value: info.author, inline: true },
        { name: 'Position', value: player.queue.tracks.length.toString(), inline: true }
      ] : [
        { name: 'Amount', value: result.tracks.length + ' songs', inline: true },
        { name: 'Author', value: info.author, inline: true },
        { name: 'Position', value: `${player.queue.tracks.length - result.tracks.length + 1}-${player.queue.tracks.length}`, inline: true }
      ])
      .setFooter({ text: 'Kalliope', iconURL: interaction.client.user.displayAvatarURL() })

    const message = await interaction.editReply({ embeds: [embed] })
    await addMusicControls(message, player)
  }
}
