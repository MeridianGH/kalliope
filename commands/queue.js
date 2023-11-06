// noinspection JSCheckFunctionSignatures

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { logging } from '../utilities/logging.js'
import { msToHMS } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Displays the queue.'),
  async execute(interaction) {
    if (!genericChecks(interaction)) { return }
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    const queue = player.queue
    const trackInfo = queue.current.info
    const pages = []

    if (queue.tracks.length === 0) {
      // Format single page with no upcoming songs.
      let description = 'Still using old and boring commands? Use the new [web dashboard](http://localhost) instead!\n\n'
      description += `Now Playing:\n[${trackInfo.title}](${trackInfo.uri}) | \`${trackInfo.isStream ? '🔴 Live' : msToHMS(trackInfo.duration)}\`\n\n`
      description += 'No upcoming songs.\nAdd songs with `/play`!\n' + '\u2015'.repeat(34)

      const embed = new EmbedBuilder()
        .setAuthor({ name: 'Queue.', iconURL: interaction.member.displayAvatarURL() })
        .setDescription(description)
        .setFooter({ text: `Kalliope | Page 1/1 | Repeat: ${player.repeatMode === 'queue' ? '🔁 Queue' : player.repeatMode === 'track' ? '🔂 Track' : '❌'}`, iconURL: interaction.client.user.displayAvatarURL() })
      pages.push(embed)
    } else if (queue.tracks.length > 0 && queue.tracks.length <= 10) {
      // Format single page.
      let description = 'Still using old and boring commands? Use the new [web dashboard](http://localhost) instead!\n\n'
      description += `Now Playing:\n[${trackInfo.title}](${trackInfo.uri}) | \`${trackInfo.isStream ? '🔴 Live' : msToHMS(trackInfo.duration)}\`\n\n`
      for (const track of queue) { description += `\`${queue.tracks.indexOf(track) + 1}.\` [${track.info.title}](${track.info.uri}) | \`${track.info.isStream ? '🔴 Live' : msToHMS(track.info.duration)}\`\n\n` }
      description += `**${queue.tracks.length} songs in queue | ${msToHMS(queue.utils.totalDuration())} total duration**\n${'\u2015'.repeat(34)}`

      const embed = new EmbedBuilder()
        .setAuthor({ name: 'Queue.', iconURL: interaction.member.displayAvatarURL() })
        .setDescription(description)
        .setFooter({ text: `Kalliope | Page 1/1 | Repeat: ${player.repeatMode === 'queue' ? '🔁 Queue' : player.repeatMode === 'track' ? '🔂 Track' : '❌'}`, iconURL: interaction.client.user.displayAvatarURL() })
      pages.push(embed)
    } else {
      // Format all pages.
      for (let i = 0; i < queue.tracks.length; i += 10) {
        const tracks = queue.tracks.slice(i, i + 10)

        let description = 'Still using old and boring commands? Use the new [web dashboard](http://localhost) instead!\n\n'
        description += `Now Playing:\n[${trackInfo.title}](${trackInfo.uri}) | \`${trackInfo.isStream ? '🔴 Live' : msToHMS(trackInfo.duration)}\`\n\n`
        for (const track of tracks) { description += `\`${queue.tracks.indexOf(track) + 1}.\` [${track.info.title}](${track.info.uri}) | \`${track.info.isStream ? '🔴 Live' : msToHMS(track.info.duration)}\`\n\n` }
        description += `**${queue.tracks.length} songs in queue | ${msToHMS(queue.utils.totalDuration())} total duration**\n${'\u2015'.repeat(34)}`

        const embed = new EmbedBuilder()
          .setAuthor({ name: 'Queue.', iconURL: interaction.member.displayAvatarURL() })
          .setDescription(description)
          .setFooter({ text: `Kalliope | Page ${pages.length + 1}/${Math.ceil(queue.tracks.length / 10)} | Repeat: ${player.repeatMode === 'queue' ? '🔁 Queue' : player.repeatMode === 'track' ? '🔂 Track' : '❌'}`, iconURL: interaction.client.user.displayAvatarURL() })
        pages.push(embed)
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

    const message = await interaction.reply({ embeds: [pages[0]], components: isOnePage ? [] : [new ActionRowBuilder().setComponents([previous.setDisabled(true), next.setDisabled(false)])], fetchReply: true })

    if (!isOnePage) {
      // Collect button interactions (when a user clicks a button),
      const collector = message.createMessageComponentCollector({ idle: 300000 })
      let currentIndex = 0
      collector.on('collect', async (buttonInteraction) => {
        buttonInteraction.customId === 'previous' ? currentIndex -= 1 : currentIndex += 1
        await buttonInteraction.update({ embeds: [pages[currentIndex]], components: [new ActionRowBuilder({ components: [previous.setDisabled(currentIndex === 0), next.setDisabled(currentIndex === pages.length - 1)] })] })
      })
      collector.on('end', async () => {
        const fetchedMessage = await message.fetch(true).catch((e) => { logging.warn(`Failed to edit message components: ${e}`) })
        await fetchedMessage?.edit({ components: [new ActionRowBuilder().setComponents(fetchedMessage.components[0].components.map((component) => ButtonBuilder.from(component.toJSON()).setDisabled(true)))] })
      })
    }
  }
}
