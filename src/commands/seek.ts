import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { errorEmbed, msToHMS, simpleEmbed, timeToMs } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types'

const command: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Skips to the specified point in the current track.')
    .addStringOption((option) => option.setName('time').setDescription('The time to skip to. Can be seconds or HH:MM:SS.').setRequired(true)),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!genericChecks(interaction, player)) { return }

    const time = timeToMs(interaction.options.getString('time', true))
    if (player.queue.current.info.isStream) { return await interaction.reply(errorEmbed('You can\'t seek in a livestream!', true)) }
    if (!player.queue.current.info.isSeekable) { return await interaction.reply(errorEmbed('You can\'t seek in this track!', true)) }
    if (time < 0 || time > player.queue.current.info.duration) { return await interaction.reply(errorEmbed(`You can only seek between 0:00-${msToHMS(player.queue.current.info.duration)}!`, true)) }

    await interaction.reply(simpleEmbed(`⏩ Skipped to ${msToHMS(time)}`))
    await player.seek(time)
    interaction.client.websocket?.updatePlayer(player)
  }
}
export const { data, execute } = command
