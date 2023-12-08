import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { addMusicControls, msToHMS } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types.js'

export const { data, execute }: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Shows the currently playing song.'),
  async execute(interaction) {
    if (!genericChecks(interaction)) { return }

    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    const track = player.queue.current
    const trackInfo = track.info

    const progress = Math.round(20 * player.position / trackInfo.duration)
    const progressBar = '▬'.repeat(progress) + '🔘' + ' '.repeat(20 - progress)

    // noinspection JSCheckFunctionSignatures
    const embed = new EmbedBuilder()
      .setAuthor({ name: 'Now Playing...', iconURL: interaction.member.displayAvatarURL() })
      .setTitle(trackInfo.title)
      .setURL(trackInfo.uri)
      .setThumbnail(track.pluginInfo.artworkUrl)
      .addFields([
        { name: 'Duration', value: trackInfo.isStream ? '🔴 Live' : `\`${progressBar}\`\n\`${msToHMS(player.position)}/${msToHMS(trackInfo.duration)}\``, inline: true },
        { name: 'Author', value: trackInfo.author, inline: true },
        { name: 'Requested By', value: track.requester.toString(), inline: true }
      ])
      .setFooter({ text: `Kalliope | Repeat: ${player.repeatMode === 'queue' ? '🔁 Queue' : player.repeatMode === 'track' ? '🔂 Track' : '❌'}`, iconURL: interaction.client.user.displayAvatarURL() })

    // noinspection JSUnresolvedReference
    if (track.pluginInfo.uri) { embed.setDescription(`This track has been resolved on [YouTube](${track.pluginInfo.uri}).`) }

    const message = await interaction.reply({ embeds: [embed], fetchReply: true })
    await addMusicControls(message, player)
  }
}
