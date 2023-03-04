import { SlashCommandBuilder } from 'discord.js'
import { errorEmbed, simpleEmbed } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Removes the specified track from the queue.')
    .addIntegerOption((option) => option.setName('track').setDescription('The track to remove.').setRequired(true)),
  async execute(interaction) {
    const index = interaction.options.getInteger('track')
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!player || !player.queue.current) { return await interaction.reply(errorEmbed('Nothing currently playing.\nStart playback with `/play`!', true)) }
    if (interaction.member.voice.channel?.id !== player.voiceChannel) { return await interaction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true)) }

    if (index < 1 || index > player.queue.length) { return await interaction.reply(errorEmbed(`You can only specify a song number between 1-${player.queue.length}.`, true)) }
    const track = player.queue.remove(index - 1)[0]
    await interaction.reply(simpleEmbed(`🗑️ Removed track \`#${index}\`: **${track.title}**`))
    interaction.client.websocket?.updatePlayer(player)
  }
}
