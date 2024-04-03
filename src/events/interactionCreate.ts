import { logging } from '../utilities/logging.js'
import { errorEmbed } from '../utilities/utilities.js'
import { EventStructure } from '../types/types.js'

export const { data, execute }: EventStructure<'interactionCreate'> = {
  data: { name: 'interactionCreate' },
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) { return }
    if (!interaction.inCachedGuild()) {
      await interaction.reply(errorEmbed('Commands are not supported in DMs.\nPlease use the bot in a server.'))
      return
    }

    const command = interaction.client.commands.get(interaction.commandName)

    try {
      await command?.execute(interaction)
    } catch (error) {
      logging.error(error)
      const embed = errorEmbed('There was an error while executing this command!', true)
      interaction.replied || interaction.deferred ? await interaction.editReply(embed) : await interaction.reply(embed)
      return
    }

    logging.info(`[Discord]   ${interaction.user.tag} triggered /${interaction.commandName} in #${interaction.channel.name}/${interaction.guild.name}.`)
  }
}
