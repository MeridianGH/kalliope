import { AttachmentBuilder, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { addMusicControls, formatMusicFooter, generateTimelineImage, msToHMS } from '../utilities/utilities.js'
import { CommandStructure, Requester } from '../types/types'

const command: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Shows the currently playing song.'),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!genericChecks(interaction, player)) { return }

    const track = player.queue.current
    const trackInfo = track.info

    const embed = new EmbedBuilder()
      .setAuthor({ name: 'Now Playing...', iconURL: interaction.member.displayAvatarURL() })
      .setTitle(trackInfo.title)
      .setURL(trackInfo.uri)
      .setThumbnail(trackInfo.artworkUrl)
      .addFields([
        { name: 'Duration', value: trackInfo.isStream ? '🔴 Live' : msToHMS(trackInfo.duration), inline: true },
        { name: 'Author', value: trackInfo.author, inline: true },
        { name: 'Requested By', value: (track.requester as Requester).toString(), inline: true }
      ])
      .setFooter({ text: `Kalliope | ${formatMusicFooter(player)}`, iconURL: interaction.client.user.displayAvatarURL() })
      .setImage('attachment://timeline.png')

    if (track.info.sourceName === 'spotify') { embed.setDescription(`This track has been resolved on [YouTube](${track.pluginInfo.uri}).`) }
    if (track.pluginInfo.clientData?.fromAutoplay) { embed.setDescription('This track has been added by autoplay.') }
    if (track.pluginInfo.clientData?.segments) {
      embed.addFields([{ name: 'SponsorBlock', value: 'This track contains SponsorBlock segments (in orange) that will be skipped automatically.' }])
    }

    const timelineImage = await generateTimelineImage(player)
    const response = await interaction.reply({
      embeds: [embed],
      withResponse: true,
      files: timelineImage ? [new AttachmentBuilder(timelineImage, { name: 'timeline.png' })] : []
    })
    if (response.resource?.message) { await addMusicControls(response.resource.message, player) }
  }
}
export const { data, execute } = command
