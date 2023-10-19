import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v10'
import { appId, token } from './utilities/config.js'
import { logging } from './utilities/logging.js'
import { getFilesRecursively } from './utilities/utilities.js'

const commands = []

for (const file of getFilesRecursively('./commands')) {
  const command = await import(`./${file}`)
  commands.push(command.data.toJSON())
}

const rest = new REST({ version: '10' }).setToken(token)

if (process.argv.includes('guild')) {
  if (process.argv[process.argv.indexOf('guild') + 1]) {
    rest.put(Routes.applicationGuildCommands(appId, process.argv[process.argv.indexOf('guild') + 1]), { body: commands })
      .then(() => logging.info('Successfully registered guild application commands.'))
      .catch((error) => logging.error(error))
  } else {
    logging.error('Please specify a guild ID.')
  }
} else if (process.argv.includes('clear')) {
  rest.put(Routes.applicationCommands(appId), { body: [] })
    .then(() => logging.info('Successfully cleared global application commands.'))
    .catch((error) => logging.error(error))
  if (process.argv[process.argv.indexOf('clear') + 1]) {
    rest.put(Routes.applicationGuildCommands(appId, process.argv[process.argv.indexOf('clear') + 1]), { body: [] })
      .then(() => logging.info('Successfully cleared guild application commands.'))
      .catch((error) => logging.error(error))
  }
} else {
  rest.put(Routes.applicationCommands(appId), { body: commands })
    .then(() => logging.info('Successfully registered global application commands.'))
    .catch((error) => logging.error(error))
}
