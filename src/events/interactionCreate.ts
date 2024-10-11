import { logging } from '../utilities/logging.js'
import { errorEmbed } from '../utilities/utilities.js'
import { EventStructure } from '../types/types'

const event: EventStructure<'interactionCreate'> = {
  data: { name: 'interactionCreate' },
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      if (!interaction.inCachedGuild()) {
        await interaction.reply(errorEmbed('Commands are not supported in DMs.\nPlease use the bot in a server.'))
        return
      }

      logging.info(`[Discord]   ${interaction.user.tag} triggered /${interaction.commandName} in #${interaction.channel?.name}/${interaction.guild.name}.`)
      const command = interaction.client.commands.get(interaction.commandName)

      try {
        await command?.execute(interaction)
      } catch (error) {
        logging.error(error)
        const embed = errorEmbed('There was an error while executing this command!', true)
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply(embed)
        } else {
          await interaction.reply(embed)
        }
        return
      }
    } else if (interaction.isContextMenuCommand()) {
      if (!interaction.inCachedGuild()) {
        await interaction.reply(errorEmbed('Context menus are not supported in DMs.\nPlease use the bot in a server.'))
        return
      }

      const contextMenu = interaction.client.contextMenus.get(interaction.commandName)
      logging.info(`[Discord]   ${interaction.user.tag} used menu '${interaction.commandName}' in #${interaction.channel?.name}/${interaction.guild.name}.`)

      try {
        await contextMenu?.execute(interaction)
      } catch (error) {
        logging.error(error)
        const embed = errorEmbed('There was an error while executing this command!', true)
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply(embed)
        } else {
          await interaction.reply(embed)
        }
        return
      }
    }
  }
}
export const { data, execute } = event
