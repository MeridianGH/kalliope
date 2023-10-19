import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { simpleEmbed } from '../utilities/utilities.js'

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
    await genericChecks(interaction)
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)

    // TODO: Fix reimplement filters
    const filter = interaction.options.getString('filter')
    // noinspection JSUnresolvedFunction
    player.setFilter(filter)
    await interaction.reply(simpleEmbed(`Set filter to ${filter}.`))
    interaction.client.websocket.updatePlayer(player)
  }
}
