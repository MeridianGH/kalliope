import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { errorEmbed, simpleEmbed } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('previous')
    .setDescription('Plays the previous track.'),
  async execute(interaction) {
    await genericChecks(interaction)
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    if (player.queue.previous.length === 0) { return await interaction.reply(errorEmbed('You can\'t use the command `/previous` right now!', true)) }

    const track = player.previousTracks.pop()
    await player.queue.add(track)
    interaction.client.lavalink.once('trackEnd', (player) => { player.queue.add(player.previousTracks.pop()) })
    player.skip()

    await interaction.reply(simpleEmbed(`⏮ Playing previous track \`#0\`: **${track.title}**.`))
    interaction.client.websocket.updatePlayer(player)
  }
}
