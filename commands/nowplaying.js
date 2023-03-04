import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { addMusicControls, errorEmbed, msToHMS } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Shows the currently playing song.'),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!player || !player.queue.current) { return await interaction.reply(errorEmbed('Nothing currently playing.\nStart playback with `/play`!', true)) }
    if (interaction.member.voice.channel?.id !== player.voiceChannel) { return await interaction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true)) }

    const track = player.queue.current

    const progress = Math.round(20 * player.position / player.queue.current.duration)
    const progressBar = '▬'.repeat(progress) + '🔘' + ' '.repeat(20 - progress) + '\n' + msToHMS(player.position) + '/' + msToHMS(player.queue.current.duration)

    const embed = new EmbedBuilder()
      .setAuthor({ name: 'Now Playing...', iconURL: interaction.member.user.displayAvatarURL() })
      .setTitle(track.title)
      .setURL(track.uri)
      .setThumbnail(track.thumbnail)
      .addFields([
        { name: 'Duration', value: track.isStream ? '🔴 Live' : `\`${progressBar}\``, inline: true },
        { name: 'Author', value: track.author, inline: true },
        { name: 'Requested By', value: track.requester.toString(), inline: true }
      ])
      .setFooter({ text: `Kalliope | Repeat: ${player.queueRepeat ? '🔁 Queue' : player.trackRepeat ? '🔂 Track' : '❌'}`, iconURL: interaction.client.user.displayAvatarURL() })

    const message = await interaction.reply({ embeds: [embed], fetchReply: true })
    await addMusicControls(message, player)
  }
}
