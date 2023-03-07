// noinspection JSCheckFunctionSignatures

import { ActionRowBuilder, EmbedBuilder, PermissionsBitField, SelectMenuBuilder, SlashCommandBuilder } from 'discord.js'
import { addMusicControls, errorEmbed, msToHMS } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Searches five songs from YouTube and lets you select one to play.')
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
    if (result.loadType !== 'SEARCH_RESULT') { return await interaction.editReply(errorEmbed('There was an error while adding your song to the queue.')) }
    const tracks = result.tracks.slice(0, 5).map((track, index) => ({ label: track.title, description: track.author, value: index.toString() }))

    const selectMenu = new SelectMenuBuilder()
      .setCustomId('search')
      .setPlaceholder('Select a song...')
      .addOptions(...tracks)

    const embedMessage = await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setAuthor({ name: 'Search Results.', iconURL: interaction.member.user.displayAvatarURL() })
          .setTitle(`Here are the search results for your search\n"${query}":`)
          .setThumbnail(result.tracks[0].thumbnail)
          .setFooter({ text: 'Kalliope | This embed expires after one minute.', iconURL: interaction.client.user.displayAvatarURL() })
      ],
      components: [new ActionRowBuilder().setComponents(selectMenu)]
    })

    const collector = embedMessage.createMessageComponentCollector({ time: 60000, filter: async (c) => { await c.deferUpdate(); return c.user.id === interaction.user.id } })
    collector.on('collect', async (menuInteraction) => {
      const track = result.tracks[Number(menuInteraction.values[0])]
      player.queue.add(track)
      if (player.state !== 'CONNECTED') {
        if (!interaction.member.voice.channel) {
          player.destroy()
          return await interaction.editReply(Object.assign(errorEmbed('You need to be in a voice channel to use this command.'), { components: [] }))
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

      const message = await menuInteraction.editReply({ embeds: [embed], components: [] })
      collector.stop()
      await addMusicControls(message, player)
    })
  }
}
