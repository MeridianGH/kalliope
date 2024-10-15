import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { errorEmbed, simpleEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types'
import { Track } from 'lavalink-client'

const command: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Removes the specified track from the queue.')
    .addIntegerOption((option) => option.setName('track').setDescription('The track to remove.').setRequired(true)),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!genericChecks(interaction, player)) { return }

    const index = interaction.options.getInteger('track', true)
    if (index < 1 || index > player.queue.tracks.length) { return await interaction.reply(errorEmbed(`You can only specify a song number between 1-${player.queue.tracks.length}.`, true)) }
    const track = await player.queue.splice(index - 1, 1) as Track
    await interaction.reply(simpleEmbed(`🗑️ Removed track \`#${index}\`: **${track?.info.title ?? 'Unknown track'}**`))
    interaction.client.websocket?.updatePlayer(player)
  }
}
export const { data, execute } = command
