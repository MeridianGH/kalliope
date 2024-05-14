import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v10'
import { logging } from './logging.js'
import { getFilesRecursively } from './utilities.js'
import 'dotenv/config'
import { CommandStructure, ContextMenuStructure } from '../types/types'

const commands = []

for (const file of getFilesRecursively('commands')) {
  const command = await import(file) as CommandStructure
  commands.push(command.data.toJSON())
}
for (const file of getFilesRecursively('menus')) {
  const contextMenu = await import(file) as ContextMenuStructure
  commands.push(contextMenu.data.toJSON())
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN)

if (process.argv.includes('guild')) {
  if (process.argv[process.argv.indexOf('guild') + 1]) {
    rest.put(Routes.applicationGuildCommands(process.env.DISCORD_APP_ID, process.argv[process.argv.indexOf('guild') + 1]), { body: commands })
      .then(() => logging.info('Successfully registered guild application commands.'))
      .catch((error) => logging.error(error))
  } else {
    logging.error('Please specify a guild ID.')
  }
} else if (process.argv.includes('clear')) {
  rest.put(Routes.applicationCommands(process.env.DISCORD_APP_ID), { body: [] })
    .then(() => logging.info('Successfully cleared global application commands.'))
    .catch((error) => logging.error(error))
  if (process.argv[process.argv.indexOf('clear') + 1]) {
    rest.put(Routes.applicationGuildCommands(process.env.DISCORD_APP_ID, process.argv[process.argv.indexOf('clear') + 1]), { body: [] })
      .then(() => logging.info('Successfully cleared guild application commands.'))
      .catch((error) => logging.error(error))
  }
} else {
  rest.put(Routes.applicationCommands(process.env.DISCORD_APP_ID), { body: commands })
    .then(() => logging.info('Successfully registered global application commands.'))
    .catch((error) => logging.error(error))
}
