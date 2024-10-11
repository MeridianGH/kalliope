import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponent,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder
} from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { logging } from '../utilities/logging.js'
import { CommandStructure } from '../types/types'
import { formatMusicFooter } from '../utilities/utilities.js'
import { findLyrics } from '../utilities/findLyrics.js'

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

    const result = await findLyrics(track)
    const link = new URL(result.link)

    const lines = result.lyrics.split('\n\n')
    const pages = [`Found lyrics on [${link.host}](${link.href}):`]
    let index = 0
    for (const item of lines) {
      if (pages[index].length + item.length > 4096) {
        index++
        pages[index] = ''
      }
      pages[index] += '\n\n' + item
    }

    const embed = new EmbedBuilder()
      .setAuthor({
        name: 'Lyrics.',
        iconURL: interaction.member.displayAvatarURL()
      })
      .setTitle(track.info.title)
      .setURL(track.info.uri)
      .setThumbnail(track.info.artworkUrl)
      .setDescription(pages[0])
      .setFooter({
        text: `Kalliope | ${formatMusicFooter(player)} | Found on ${link.host}.`,
        iconURL: interaction.client.user.displayAvatarURL()
      })

    const isOnePage = pages.length === 1

    if (isOnePage) {
      await interaction.editReply({ embeds: [embed] })
    } else {
      const previous = new ButtonBuilder()
        .setCustomId('previous')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary)
      const next = new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)

      const actionRow = isOnePage ? [] : [new ActionRowBuilder<ButtonBuilder>().setComponents([previous.setDisabled(true), next.setDisabled(false)])]
      const message = await interaction.editReply({
        embeds: [embed],
        components: actionRow
      })

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
              .setTitle(track.info.title)
              .setURL(track.info.uri)
              .setThumbnail(track.info.artworkUrl)
              .setDescription(pages[currentIndex])
              .setFooter({ text: `Kalliope | ${formatMusicFooter(player)} | Found on ${link.host}.`, iconURL: interaction.client.user.displayAvatarURL() })
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
  }
}
export const { data, execute } = command
