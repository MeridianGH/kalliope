import { EmbedBuilder, PermissionsBitField, SlashCommandBuilder } from 'discord.js'
import { addMusicControls, errorEmbed, msToHMS } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Plays a song or playlist from YouTube.')
    .addStringOption((option) => option.setName('query').setDescription('The query to search for.').setRequired(true)),
  async execute(interaction) {
    const channel = interaction.member.voice.channel
    if (!channel) { return await interaction.reply(errorEmbed('You need to be in a voice channel to use this command.', true)) }
    if (interaction.guild.members.me.voice.channel && channel !== interaction.guild.members.me.voice.channel) { return await interaction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true)) }
    if (!interaction.guild.members.me.permissionsIn(channel).has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak])) { return await interaction.reply(errorEmbed('The bot does not have the correct permissions to play in your voice channel!', true)) }
    await interaction.deferReply()

    const player = interaction.client.lavalink.createPlayer(interaction)

    const query = interaction.options.getString('query')
    const result = await player.search(query, interaction.member)
    if (result.loadType === 'LOAD_FAILED' || result.loadType === 'NO_MATCHES') { return await interaction.editReply(errorEmbed('There was an error while adding your song to the queue.')) }

    if (result.loadType === 'PLAYLIST_LOADED') {
      player.queue.add(result.tracks)

      if (player.state !== 'CONNECTED') {
        if (!interaction.member.voice.channel) {
          player.destroy()
          return await interaction.editReply(errorEmbed('You need to be in a voice channel to use this command.'))
        }
        player.setVoiceChannel(interaction.member.voice.channel.id)
        await player.connect()
      }
      if (!player.playing && !player.paused && player.queue.totalSize === result.tracks.length) { await player.play() }
      interaction.client.websocket?.updatePlayer(player)

      // noinspection JSUnresolvedVariable
      const embed = new EmbedBuilder()
        .setAuthor({ name: 'Added to queue.', iconURL: interaction.member.user.displayAvatarURL() })
        .setTitle(result.playlist.name)
        .setURL(result.playlist.uri)
        .setThumbnail(result.playlist.thumbnail)
        .addFields([
          { name: 'Amount', value: result.tracks.length + ' songs', inline: true },
          { name: 'Author', value: result.playlist.author, inline: true },
          { name: 'Position', value: `${player.queue.indexOf(result.tracks[0]) + 1}-${player.queue.indexOf(result.tracks[result.tracks.length - 1]) + 1}`, inline: true }
        ])
        .setFooter({ text: 'Kalliope', iconURL: interaction.client.user.displayAvatarURL() })
      const message = await interaction.editReply({ embeds: [embed] })
      await addMusicControls(message, player)
    } else {
      const track = result.tracks[0]
      player.queue.add(track)
      if (player.state !== 'CONNECTED') {
        if (!interaction.member.voice.channel) {
          player.destroy()
          return await interaction.editReply(errorEmbed('You need to be in a voice channel to use this command.'))
        }
        player.setVoiceChannel(interaction.member.voice.channel.id)
        await player.connect()
      }
      if (!player.playing && !player.paused && !player.queue.length) { await player.play() }
      interaction.client.websocket?.updatePlayer(player)

      const embed = new EmbedBuilder()
        .setAuthor({ name: 'Added to queue.', iconURL: interaction.member.user.displayAvatarURL() })
        .setTitle(track.title)
        .setURL(track.uri)
        .setThumbnail(track.thumbnail)
        .addFields([
          { name: 'Duration', value: track.isStream ? '🔴 Live' : msToHMS(track.duration), inline: true },
          { name: 'Author', value: track.author, inline: true },
          { name: 'Position', value: (player.queue.indexOf(track) + 1).toString(), inline: true }
        ])
        .setFooter({ text: 'Kalliope', iconURL: interaction.client.user.displayAvatarURL() })
      const message = await interaction.editReply({ embeds: [embed] })
      await addMusicControls(message, player)
    }
  }
}
