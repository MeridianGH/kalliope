import { ActivityType, Client, Collection, GatewayIntentBits } from 'discord.js'
import { Lavalink } from './music/lavalink.js'
import { logging } from './utilities/logging.js'
import { getFilesRecursively } from './utilities/utilities.js'
import { Runtime } from 'node:inspector'
import 'dotenv/config'


const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates], presence: { status: 'online', activities: [{ name: 'kalliope.cc', type: ActivityType.Listening }] } })
client.lavalink = new Lavalink(client)

// Commands
client.commands = new Collection()
for (const file of getFilesRecursively('commands')) {
  import(file).then((command) => {
    client.commands.set(command.data.name, command)
  })
}

// Context menus
client.contextMenus = new Collection()
for (const file of getFilesRecursively('menus')) {
  import(file).then((contextMenu) => {
    client.contextMenus.set(contextMenu.data.name, contextMenu)
  })
}

// Events
for (const file of getFilesRecursively('events')) {
  import(file).then((event) => {
    if (event.data.once) {
      client.once(event.data.name, (...args) => event.execute(...args))
    } else {
      client.on(event.data.name, (...args) => event.execute(...args))
    }
  })
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
process.on('uncaughtException', (error) => {
  logging.warn(`[Process]   Ignoring uncaught exception: ${error.message}`)
  logging.error(error.stack)
})
process.on('unhandledRejection', (reason) => {
  logging.warn(`[Process]   Unhandled promise rejection: ${reason}`)
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
client.lavalink.initialize().then(() => {
  // noinspection JSIgnoredPromiseFromCall
  client.login(process.env.DISCORD_TOKEN)
})
