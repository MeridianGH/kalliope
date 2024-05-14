import { ApplicationCommandType, ContextMenuCommandBuilder } from 'discord.js'
import { addMusicControls, errorEmbed } from '../utilities/utilities.js'
import { loadChecks, playChecks } from '../utilities/checks.js'
import { SearchResult } from 'lavalink-client'
import { ContextMenuStructure } from '../types/types'

export const { data, execute }: ContextMenuStructure = {
  data: new ContextMenuCommandBuilder()
    .setName('Play this song again')
    .setType(ApplicationCommandType.Message),
  async execute(interaction) {
    if (!interaction.isMessageContextMenuCommand()) { return }

    const targetMessage = interaction.targetMessage
    if (targetMessage.author.id !== interaction.client.user.id) {
      await interaction.reply(errorEmbed('**This message is not from Kalliope.**\n\n' +
        'Use this action on a message from Kalliope that contains information about a song\n' +
        '(i.e. \'Added to queue.\' or \'Now playing...\'', true))
      return
    }
    if (targetMessage.embeds.length === 0) {
      await interaction.reply(errorEmbed('**This message does not contain any embeds to read.**\n\n' +
        'Use this action on a message from Kalliope that contains information about a song\n' +
        '(i.e. \'Added to queue.\' or \'Now playing...\'', true))
      return
    }
    if (!targetMessage.embeds[0].data.url) {
      await interaction.reply(errorEmbed('**This embed does not contain any URLs.**\n\n' +
        'Use this action on a message from Kalliope that contains information about a song\n' +
        '(i.e. \'Added to queue.\' or \'Now playing...\'', true))
      return
    }

    if (!playChecks(interaction)) { return }
    await interaction.deferReply()

    const player = interaction.client.lavalink.createPlayer(interaction)
    const result = await player.extendedSearch(targetMessage.embeds[0].data.url, interaction.member) as SearchResult
    // noinspection DuplicatedCode
    if (!loadChecks(interaction, result)) { return }

    if (!player.connected) {
      if (!interaction.member.voice.channel) {
        await player.destroy()
        await interaction.editReply(errorEmbed('You need to be in a voice channel to use this command.'))
        return
      }
      await player.connect()
    }

    const embed = await interaction.client.lavalink.processPlayResult(player, result)

    interaction.client.websocket?.updatePlayer(player)
    const message = await interaction.editReply({ embeds: [embed] })
    await addMusicControls(message, player)
  }
}
