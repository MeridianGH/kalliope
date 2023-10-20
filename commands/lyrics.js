// noinspection JSCheckFunctionSignatures

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import genius from 'genius-lyrics'
import ytdl from 'ytdl-core'
import { genericChecks } from '../utilities/checks.js'
import { geniusClientToken } from '../utilities/config.js'
import { logging } from '../utilities/logging.js'

const Genius = new genius.Client(geniusClientToken)

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Shows the lyrics of the currently playing song.'),
  async execute(interaction) {
    await genericChecks(interaction)

    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    await interaction.deferReply()

    const trackInfo = player.queue.current.info
    const info = await ytdl.getInfo(trackInfo.uri)
    const title = info.videoDetails.media.category === 'Music' ? info.videoDetails.media.artist + ' ' + info.videoDetails.media.song : trackInfo.title

    try {
      const search = await Genius.songs.search(title)
      const song = search[0]
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
        .setTitle(trackInfo.title)
        .setURL(song.url)
        .setThumbnail(trackInfo.artworkUrl)
        .setDescription(pages[0])
        .setFooter({ text: `Kalliope | Repeat: ${player.repeatMode === 'queue' ? '🔁 Queue' : player.repeatMode === 'track' ? '🔂 Track' : '❌'} | Provided by genius.com`, iconURL: interaction.client.user.displayAvatarURL() })

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
                .setTitle(trackInfo.title)
                .setURL(song.url)
                .setThumbnail(trackInfo.artworkUrl)
                .setDescription(pages[currentIndex])
                .setFooter({ text: `Kalliope | Repeat: ${player.repeatMode === 'queue' ? '🔁 Queue' : player.repeatMode === 'track' ? '🔂 Track' : '❌'} | Provided by genius.com`, iconURL: interaction.client.user.displayAvatarURL() })
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
            .setTitle(trackInfo.title)
            .setURL(trackInfo.uri)
            .setThumbnail(trackInfo.artworkUrl)
            .setDescription('No results found!')
            .setFooter({ text: `Kalliope | Repeat: ${player.repeatMode === 'queue' ? '🔁 Queue' : player.repeatMode === 'track' ? '🔂 Track' : '❌'} | Provided by genius.com`, iconURL: interaction.client.user.displayAvatarURL() })
        ]
      })
    }
  }
}
