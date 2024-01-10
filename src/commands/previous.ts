import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { errorEmbed, simpleEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types.js'

export const { data, execute }: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('previous')
    .setDescription('Plays the previous track.'),
  async execute(interaction) {
    if (!genericChecks(interaction)) { return }
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    if (player.queue.previous.length === 0) { return await interaction.reply(errorEmbed('You can\'t use the command `/previous` right now!', true)) }

    const track = player.queue.previous.shift()
    await player.play({ track: track })
    await player.queue.add(player.queue.previous.shift(), 0)

    await interaction.reply(simpleEmbed(`⏮️ Playing previous track \`#0\`: **${track.info.title}**.`))
    interaction.client.websocket.updatePlayer(player)
  }
}
