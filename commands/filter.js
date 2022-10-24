import { SlashCommandBuilder } from 'discord.js'
import { errorEmbed, simpleEmbed } from '../utilities/utilities.js'

export const { data, execute } = {
  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Sets filter modes for the player.')
    .addStringOption((option) => option.setName('filter').setDescription('The filter to select.').setRequired(true).addChoices(
      { name: 'None', value: 'none' },
      { name: 'Bass Boost', value: 'bassboost' },
      { name: 'Classic', value: 'classic' },
      { name: '8D', value: 'eightd' },
      { name: 'Earrape', value: 'earrape' },
      { name: 'Karaoke', value: 'karaoke' },
      { name: 'Nightcore', value: 'nightcore' },
      { name: 'Superfast', value: 'superfast' },
      { name: 'Vaporwave', value: 'vaporwave' }
    )),
  async execute(interaction) {
    const filter = interaction.options.getString('filter')
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!player || !player.queue.current) { return await interaction.reply(errorEmbed('Nothing currently playing.\nStart playback with `/play`!', true)) }
    if (interaction.member.voice.channel?.id !== player.voiceChannel) { return await interaction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true)) }

    // noinspection JSUnresolvedFunction
    player.setFilter(filter)
    await interaction.reply(simpleEmbed(`Set filter to ${filter}.`))
    // Update Dashboard
  }
}
