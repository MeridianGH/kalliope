import { ActivityType, Client, Collection, GatewayIntentBits } from 'discord.js'
import { Lavalink } from './music/lavalink.js'
import { logging } from './utilities/logging.js'
import { getFilesRecursively } from './utilities/utilities.js'
import 'dotenv/config'

import { Runtime } from 'node:inspector'

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates], presence: { status: 'online', activities: [{ name: 'kalliope.cc', type: ActivityType.Listening }] } })
client.lavalink = new Lavalink(client)
await client.lavalink.initialize()

// Commands
client.commands = new Collection()
for (const file of getFilesRecursively('commands')) {
  const command = await import(file)
  client.commands.set(command.data.name, command)
}

// Events
for (const file of getFilesRecursively('events')) {
  const event = await import(file)
  if (event.data.once) {
    client.once(event.data.name, (...args) => event.execute(...args))
  } else {
    client.on(event.data.name, (...args) => event.execute(...args))
  }
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
process.on('uncaughtException', (error) => {
  logging.warn(`Ignoring uncaught exception: ${error.message}`)
  logging.error(error.stack)
})
process.on('unhandledRejection', (reason) => {
  logging.warn(`Unhandled promise rejection: ${reason}`)
  logging.error((reason as { stack?: Runtime.StackTrace } | undefined)?.stack ?? reason)
})

/**
 * Handles a shutdown. Gracefully closes all players and connections and exits the process.
 */
async function shutdown() {
  logging.info('[Process]   Received SIGTERM, shutting down.')
  await client.lavalink.destroy()
  client.websocket?.close()
  await client.destroy()
  process.exit(0)
}

// Login
await client.login(process.env.DISCORD_TOKEN)
