import { ActivityType, Client, Collection, EmbedBuilder, GatewayIntentBits, GuildTextBasedChannel } from 'discord.js'
import { iconURL } from './events/ready.js'
import { Lavalink } from './music/lavalink.js'
import { logging } from './utilities/logging.js'
import { getFilesRecursively } from './utilities/utilities.js'
import 'dotenv/config'

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
  logging.warn(`Ignoring uncaught exception: ${error} | ${error.stack.split(/\r?\n/)[1].split('\\').pop().slice(0, -1).trim()}`)
  logging.error(error.stack)
})
process.on('unhandledRejection', (error: string) => {
  logging.warn(`Unhandled promise rejection: ${error}`)
  logging.error(error)
})

/**
 * Handles a shutdown. Gracefully closes all players and connections and exits the process.
 */
async function shutdown() {
  logging.info('[Process]   Received SIGTERM, shutting down.')
  logging.info(`[Lavalink]  Closing ${client.lavalink.manager.players.size} queues.`)
  for (const player of client.lavalink.manager.players.values()) {
    const textChannel = client.channels.cache.get(player.textChannelId) as GuildTextBasedChannel
    await textChannel?.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('Server shutdown.')
          .setDescription('The server the bot is hosted on has been shut down.\n')
          .setFooter({ text: 'Kalliope', iconURL: iconURL })
          .setColor([255, 0, 0])
      ]
    })
    // noinspection ES6MissingAwait
    player.destroy()
  }
  client.websocket.close()
  await client.destroy()
  process.exit(0)
}

// Login
await client.login(process.env.DISCORD_TOKEN)
