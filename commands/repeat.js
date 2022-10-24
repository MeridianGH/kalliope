import { SlashCommandBuilder } from 'discord.js'
import { errorEmbed, simpleEmbed } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('repeat')
    .setDescription('Sets the current repeat mode.')
    .addStringOption((option) => option.setName('mode').setDescription('The mode to set.').setRequired(true).addChoices(
      { name: 'None', value: 'none' },
      { name: 'Track', value: 'track' },
      { name: 'Queue', value: 'queue' }
    )),
  async execute(interaction) {
    const mode = interaction.options.getString('mode')
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!player || !player.queue.current) { return await interaction.reply(errorEmbed('Nothing currently playing.\nStart playback with `/play`!', true)) }
    if (interaction.member.voice.channel?.id !== player.voiceChannel) { return await interaction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true)) }

    mode === 'track' ? player.setTrackRepeat(true) : mode === 'queue' ? player.setQueueRepeat(true) : player.setTrackRepeat(false)
    await interaction.reply(simpleEmbed(`Set repeat mode to ${player.queueRepeat ? 'Queue 🔁' : player.trackRepeat ? 'Track 🔂' : 'None ▶'}`))
    // Update Dashboard
  }
}
