import { SlashCommandBuilder } from 'discord.js'
import { genericChecks } from '../utilities/checks.js'
import { simpleEmbed } from '../utilities/utilities.js'
import { CommandStructure } from '../types/types'
import { CustomFilters } from '../music/customFilters'

const filterOptions = [
  { name: 'None', value: 'none' },
  { name: 'Bass Boost', value: 'bassboost' },
  { name: 'Classic', value: 'classic' },
  { name: '8D', value: 'eightd' },
  { name: 'Earrape', value: 'earrape' },
  { name: 'Karaoke', value: 'karaoke' },
  { name: 'Nightcore', value: 'nightcore' },
  { name: 'Superfast', value: 'superfast' },
  { name: 'Vaporwave', value: 'vaporwave' }
]

const command: CommandStructure = {
  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Sets filter modes for the player.')
    .addStringOption((option) => option.setName('filter').setDescription('The filter to select.').setRequired(true).addChoices(
      ...filterOptions
    )),
  async execute(interaction) {
    const player = interaction.client.lavalink.getPlayer(interaction.guild.id)
    if (!genericChecks(interaction, player)) { return }

    const filter = interaction.options.getString('filter', true) as keyof typeof CustomFilters.filterData
    await player.get('filters').setFilter(filter)
    await interaction.reply(simpleEmbed(`Set filter to \`${filterOptions.find((option) => option.value === filter)!.name}\`.`))
    interaction.client.websocket?.updatePlayer(player)
  }
}
export const { data, execute } = command
