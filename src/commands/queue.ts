import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponent, ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder
} from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { logging } from '../utilities/logging.js'
import { durationOrLive, formatMusicFooter, msToHMS } from '../utilities/utilities.js'
import { TrackInfo, UnresolvedTrackInfo } from 'lavalink-client'
import { CommandStructure } from '../types/types'

const command: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Displays the queue.'),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!genericChecks(interaction, player)) { return }

    const queue = player.queue
    const trackInfo = queue.current.info
    const pages: EmbedBuilder[] = []

    const header =
      'Still using old and boring commands? Use the new [web dashboard](https://kalliope.cc) instead!\n\n' +
      'Now Playing:\n' + formatTrack(trackInfo)

    /**
     * Formats a track to be used in the description.
     * @param trackInfo The track to format.
     * @returns The formatted string.
     */
    function formatTrack(trackInfo: TrackInfo | UnresolvedTrackInfo) {
      return `[${trackInfo.title}](${trackInfo.uri}) | \`${durationOrLive(trackInfo)}\`\n\n`
    }

    /**
     * Formats a page of ten tracks starting at a specific index.
     * @param fromIndex The index to start from (inclusive).
     */
    function formatPage(fromIndex: number) {
      const tracks = queue.tracks.slice(fromIndex, fromIndex + 10)

      const tracksText = tracks
        .map((track, index) => `\`${index + 1}.\`` + formatTrack(track.info))
        .join('')
      const footer = `**${queue.tracks.length} songs in queue | ` +
        msToHMS(queue.utils.totalDuration()) + ' total duration**\n' +
        '\u2015'.repeat(34)

      const embed = new EmbedBuilder()
        .setAuthor({ name: 'Queue.', iconURL: interaction.member.displayAvatarURL() })
        .setDescription(header + tracksText + footer)
        .setFooter({
          text: `Kalliope | Page ${fromIndex / 10 + 1}/${Math.ceil(queue.tracks.length / 10)} | ${formatMusicFooter(player!)}`,
          iconURL: interaction.client.user.displayAvatarURL()
        })

      pages.push(embed)
    }

    if (queue.tracks.length === 0) {
      // Format single page with no upcoming songs.
      const embed = new EmbedBuilder()
        .setAuthor({ name: 'Queue.', iconURL: interaction.member.displayAvatarURL() })
        .setDescription(header +
          'No upcoming songs.\nAdd songs with `/play`!\n' +
          '\u2015'.repeat(34))
        .setFooter({
          text: `Kalliope | Page 1/1 | ${formatMusicFooter(player)}`,
          iconURL: interaction.client.user.displayAvatarURL()
        })

      pages.push(embed)
    } else {
      // Format all pages.
      for (let i = 0; i < queue.tracks.length; i += 10) {
        formatPage(i)
      }
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

    const actionRow = new ActionRowBuilder<ButtonBuilder>({
      components: [
        previous.setDisabled(true),
        next.setDisabled(false)
      ]
    })
    const message = await interaction.reply({
      embeds: [pages[0]],
      components: isOnePage ? [] : [actionRow],
      fetchReply: true
    })

    if (!isOnePage) {
      // Collect button interactions (when a user clicks a button),
      const collector = message.createMessageComponentCollector({ idle: 300000 })
      let currentIndex = 0

      const onCollect = async (buttonInteraction: ButtonInteraction<'cached'>) => {
        if (buttonInteraction.customId === 'previous') {
          currentIndex -= 1
        } else {
          currentIndex += 1
        }
        const actionRow = new ActionRowBuilder<ButtonBuilder>({
          components: [
            previous.setDisabled(currentIndex === 0),
            next.setDisabled(currentIndex === pages.length - 1)
          ]
        })
        await buttonInteraction.update({ embeds: [pages[currentIndex]], components: [actionRow] })
      }
      collector.on('collect', (buttonInteraction: ButtonInteraction<'cached'>) => void onCollect(buttonInteraction))

      const onEnd = async () => {
        const fetchedMessage = await message.fetch(true).catch((e) => {
          logging.warn(`[Discord]   Failed to edit message components: ${e}`)
        })
        if (!fetchedMessage) { return }

        const actionRow = new ActionRowBuilder<ButtonBuilder>({
          components: fetchedMessage.components[0].components.map(
            (component) => ButtonBuilder
              .from((component as ButtonComponent).toJSON())
              .setDisabled(true)
          )
        })
        await fetchedMessage.edit({ components: [actionRow] })
      }
      collector.on('end', () => void onEnd())
    }
  }
}
export const { data, execute } = command
