import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponent,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder
} from 'discord.js'
import { Client as GeniusClient } from 'genius-lyrics'
import ytdl from 'ytdl-core'
import { genericChecks } from '../utilities/checks.js'
import { logging } from '../utilities/logging.js'
import { CommandStructure } from '../types/types'
import { formatMusicFooter } from '../utilities/utilities.js'

const Genius = new GeniusClient(process.env.GENIUS_CLIENT_TOKEN)

const command: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Shows the lyrics of the currently playing song.'),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!genericChecks(interaction, player)) {
      return
    }

    await interaction.deferReply()

    const track = player.queue.current
    const trackInfo = track.info
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const info = await ytdl.getInfo(trackInfo.uri)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const title = info.videoDetails.media.category === 'Music' ? info.videoDetails.media.artist + ' ' + info.videoDetails.media.song : trackInfo.title

    try {
      const search = await Genius.songs.search(title)
      const song = search[0]
      const lyrics = await song.lyrics()

      const lines = lyrics.split('\n')
      const pages = ['']
      let index = 0
      for (const item of lines) {
        if (pages[index].length + item.length > 4096) {
          index++
          pages[index] = ''
        }
        pages[index] += '\n' + item
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
        .setAuthor({ name: 'Lyrics.', iconURL: interaction.member.displayAvatarURL() })
        .setTitle(trackInfo.title)
        .setURL(song.url)
        .setThumbnail(trackInfo.artworkUrl)
        .setDescription(pages[0])
        .setFooter({
          text: `Kalliope | ${formatMusicFooter(player)} | Provided by genius.com`,
          iconURL: interaction.client.user.displayAvatarURL()
        })

      const actionRow = isOnePage ? [] : [new ActionRowBuilder<ButtonBuilder>().setComponents([previous.setDisabled(true), next.setDisabled(false)])]
      const message = await interaction.editReply({ embeds: [embed], components: actionRow })

      if (!isOnePage) {
        // Collect button interactions (when a user clicks a button)
        const collector = message.createMessageComponentCollector({ idle: 300000 })
        let currentIndex = 0

        const onCollect = async (buttonInteraction: ButtonInteraction<'cached'>) => {
          if (buttonInteraction.customId === 'previous') {
            currentIndex -= 1
          } else {
            currentIndex += 1
          }
          await buttonInteraction.update({
            embeds: [
              new EmbedBuilder()
                .setAuthor({ name: 'Lyrics.', iconURL: interaction.member.displayAvatarURL() })
                .setTitle(trackInfo.title)
                .setURL(song.url)
                .setThumbnail(trackInfo.artworkUrl)
                .setDescription(pages[currentIndex])
                .setFooter({
                  text: `Kalliope | ${formatMusicFooter(player)} | Provided by genius.com`,
                  iconURL: interaction.client.user.displayAvatarURL()
                })
            ],
            components: [new ActionRowBuilder<ButtonBuilder>().setComponents([previous.setDisabled(currentIndex === 0), next.setDisabled(currentIndex === pages.length - 1)])]
          })
        }
        collector.on('collect', (buttonInteraction: ButtonInteraction<'cached'>) => void onCollect(buttonInteraction))

        const onEnd = async () => {
          const fetchedMessage = await message.fetch(true).catch((e) => { logging.warn(`[Discord]   Failed to edit message components: ${e}`) })
          if (!fetchedMessage) { return }
          const disabledComponents = fetchedMessage.components[0].components.map((component: ButtonComponent) => ButtonBuilder.from(component.toJSON()).setDisabled(true))
          await fetchedMessage.edit({ components: [new ActionRowBuilder<ButtonBuilder>().setComponents(disabledComponents)] })
        }
        collector.on('end', () => void onEnd())
      }
    } catch {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: 'Lyrics.',
              iconURL: interaction.member.displayAvatarURL()
            })
            .setTitle(trackInfo.title)
            .setURL(trackInfo.uri)
            .setThumbnail(trackInfo.artworkUrl)
            .setDescription('No results found!')
            .setFooter({
              text: `Kalliope | ${formatMusicFooter(player)} | Provided by genius.com`,
              iconURL: interaction.client.user.displayAvatarURL()
            })
        ]
      })
    }
  }
}
export const { data, execute } = command
