import { ActivityType, Client, ClientEvents, Collection, GatewayIntentBits } from 'discord.js'
import fetch from 'node-fetch'
import fs from 'fs'
import { Lavalink } from './music/lavalink.js'
import { logging } from './utilities/logging.js'
import { getFilesRecursively } from './utilities/utilities.js'
import { Runtime } from 'node:inspector'
import 'dotenv/config'
import { CommandStructure, ContextMenuStructure, EventStructure } from './types/types'


const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates], presence: { status: 'online', activities: [{ name: 'kalliope.cc', type: ActivityType.Listening }] } })
client.lavalink = new Lavalink(client)

// Commands
client.commands = new Collection()
for (const file of getFilesRecursively('commands')) {
  void import(file).then((command: CommandStructure) => {
    client.commands.set(command.data.name, command)
  })
}

// Context menus
client.contextMenus = new Collection()
for (const file of getFilesRecursively('menus')) {
  void import(file).then((contextMenu: ContextMenuStructure) => {
    client.contextMenus.set(contextMenu.data.name, contextMenu)
  })
}

// Events
for (const file of getFilesRecursively('events')) {
  void import(file).then((event: EventStructure<keyof ClientEvents>) => {
    if (event.data.once) {
      client.once(event.data.name, (...args) => void event.execute(...args))
    } else {
      client.on(event.data.name, (...args) => void event.execute(...args))
    }
  })
}
process.on('SIGTERM', () => void shutdown())
process.on('SIGINT', () => void shutdown())
process.on('uncaughtException', (error) => {
  logging.warn(`[Process]   Ignoring uncaught exception: ${error.message}`)
  logging.error(error.stack)
})
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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

// Check for updates
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version as string
const availableVersion = await fetch('https://api.github.com/repos/MeridianGH/kalliope/releases/latest', {
  method: 'GET',
  headers: { Accept: 'application/vnd.github+json' }
}).then((response) => response.json()).then((release: { tag_name: string }) => release.tag_name)
if (version.localeCompare(availableVersion, undefined, { numeric: true, sensitivity: 'base' }) < 0) {
  logging.warn(`[Process]   There is a newer version ${availableVersion} available. You may encounter unexpected behaviour. Please update.`)
} else {
  logging.info(`[Process]   Running on latest version ${version}.`)
}

// Login
await client.lavalink.initialize()
void client.login(process.env.DISCORD_TOKEN)
