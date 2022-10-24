import { SlashCommandBuilder } from 'discord.js'
import { errorEmbed, simpleEmbed } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('previous')
    .setDescription('Plays the previous track.'),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!player || !player.queue.current) { return await interaction.reply(errorEmbed('Nothing currently playing.\nStart playback with `/play`!', true)) }
    if (interaction.member.voice.channel?.id !== player.voiceChannel) { return await interaction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true)) }

    if (player.previousTracks.length === 0) { return await interaction.reply(errorEmbed('You can\'t use the command `/previous` right now!', true)) }

    const track = player.previousTracks.pop()
    player.queue.add(track, 0)
    player.manager.once('trackEnd', (player) => { player.queue.add(player.previousTracks.pop(), 0) })
    player.stop()

    await interaction.reply(simpleEmbed(`⏮ Playing previous track \`#0\`: **${track.title}**.`))
    // Update Dashboard
  }
}
