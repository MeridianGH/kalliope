import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { errorEmbed } from '../utilities/utilities.js'
import ytdl from 'ytdl-core'
import { geniusClientToken } from '../utilities/config.js'
import genius from 'genius-lyrics'
import { logging } from '../utilities/logging.js'

const Genius = new genius.Client(geniusClientToken)

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Shows the lyrics of the currently playing song.'),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!player || !player.queue.current) { return await interaction.reply(errorEmbed('Nothing currently playing.\nStart playback with `/play`!', true)) }
    if (interaction.member.voice.channel?.id !== player.voiceChannel) { return await interaction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true)) }
    await interaction.deferReply()

    const info = await ytdl.getInfo(player.queue.current.uri)
    const title = info.videoDetails.media.category === 'Music' ? info.videoDetails.media.artist + ' ' + info.videoDetails.media.song : player.queue.current.title

    try {
      const song = (await Genius.songs.search(title))[0]
      const lyrics = await song.lyrics()

      const lines = lyrics.split('\n')
      const pages = ['']
      let index = 0
      for (let i = 0; i < lines.length; i++) {
        if (pages[index].length + lines[i].length > 4096) {
          index++
          pages[index] = ''
        }
        pages[index] += '\n' + lines[i]
      }

      const isOnePage = pages.length === 1

      const previous = new ButtonBuilder()
        .setCustomId('previous')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary)
      const next = new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)

      const embed = new EmbedBuilder()
        .setAuthor({ name: 'Lyrics.', iconURL: interaction.member.user.displayAvatarURL() })
        .setTitle(player.queue.current.title)
        .setURL(song.url)
        .setThumbnail(player.queue.current.thumbnail)
        .setDescription(pages[0])
        .setFooter({ text: `SuitBot | Repeat: ${player.queueRepeat ? '🔁 Queue' : player.trackRepeat ? '🔂 Track' : '❌'} | Provided by genius.com`, iconURL: interaction.client.user.displayAvatarURL() })

      const message = await interaction.editReply({ embeds: [embed], components: isOnePage ? [] : [new ActionRowBuilder().setComponents([previous.setDisabled(true), next.setDisabled(false)])], fetchReply: true })

      if (!isOnePage) {
        // Collect button interactions (when a user clicks a button)
        const collector = message.createMessageComponentCollector({ idle: 300000 })
        let currentIndex = 0
        collector.on('collect', async (buttonInteraction) => {
          buttonInteraction.customId === 'previous' ? currentIndex -= 1 : currentIndex += 1
          await buttonInteraction.update({
            embeds: [
              new EmbedBuilder()
                .setAuthor({ name: 'Lyrics.', iconURL: interaction.member.user.displayAvatarURL() })
                .setTitle(player.queue.current.title)
                .setURL(song.url)
                .setThumbnail(player.queue.current.thumbnail)
                .setDescription(pages[currentIndex])
                .setFooter({ text: `SuitBot | Repeat: ${player.queueRepeat ? '🔁 Queue' : player.trackRepeat ? '🔂 Track' : '❌'} | Provided by genius.com`, iconURL: interaction.client.user.displayAvatarURL() })
            ],
            components: [new ActionRowBuilder().setComponents([previous.setDisabled(currentIndex === 0), next.setDisabled(currentIndex === pages.length - 1)])]
          })
        })
        collector.on('end', async () => {
          const fetchedMessage = await message.fetch(true).catch((e) => { logging.warn(`Failed to edit message components: ${e}`) })
          await fetchedMessage?.edit({ components: [new ActionRowBuilder().setComponents([fetchedMessage.components[0].components.map((component) => ButtonBuilder.from(component.toJSON()).setDisabled(true))])] })
        })
      }
    } catch {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setAuthor({ name: 'Lyrics.', iconURL: interaction.member.user.displayAvatarURL() })
            .setTitle(player.queue.current.title)
            .setURL(player.queue.current.uri)
            .setThumbnail(player.queue.current.thumbnail)
            .setDescription('No results found!')
            .setFooter({ text: `SuitBot | Repeat: ${player.queueRepeat ? '🔁 Queue' : player.trackRepeat ? '🔂 Track' : '❌'} | Provided by genius.com`, iconURL: interaction.client.user.displayAvatarURL() })
        ]
      })
    }
  }
}
