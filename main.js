import { ActivityType, Client, Collection, EmbedBuilder, GatewayIntentBits } from 'discord.js'
import { Lavalink } from './music/lavalink.js'
import { getFilesRecursively } from './utilities/utilities.js'
import fs from 'fs'

import { adminId, token } from './utilities/config.js'
import { iconURL } from './events/ready.js'
import { logging } from './utilities/logging.js'

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates], presence: { status: 'online', activities: [{ name: '/help | Kalliope.xyz', type: ActivityType.Playing }] } })
client.lavalink = new Lavalink(client)
await client.lavalink.initialize()

// Commands
client.commands = new Collection()
for (const file of getFilesRecursively('./commands')) {
  const command = await import(`./${file}`)
  client.commands.set(command.data.name, command)
}

// Events
for (const file of getFilesRecursively('./events')) {
  const event = await import(`./${file}`)
  if (event.data.once) {
    client.once(event.data.name, (...args) => event.execute(...args))
  } else {
    client.on(event.data.name, (...args) => event.execute(...args))
  }
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
process.on('uncaughtException', async (error) => {
  logging.warn(`Ignoring uncaught exception: ${error} | ${error.stack.split(/\r?\n/)[1].split('\\').pop().slice(0, -1).trim()}`)
  logging.error(error.stack)
/*  if (client.isReady()) {
    fs.writeFileSync('error.txt', error.stack)
    const user = await client.users.fetch(adminId)
    await user.send({ content: `\`New Exception | ${error}\``, files: ['error.txt'] })
    fs.unlink('error.txt', () => {})
  }*/
})

// Shutdown Handling
async function shutdown() {
  logging.info(`Closing ${client.lavalink.manager.players.size} queues.`)
  for (const entry of client.lavalink.manager.players) {
    const player = entry[1]
    // noinspection JSUnresolvedFunction
    await client.channels.cache.get(player.textChannel).send({
      embeds: [
        new EmbedBuilder()
          .setTitle('Server shutdown.')
          .setDescription('The server the bot is hosted on has been forced to shut down.\nThe bot should be up and running again in a few minutes.')
          .setFooter({ text: 'Kalliope', iconURL: iconURL })
          .setColor([255, 0, 0])
      ]
    })
    player.destroy()
  }
  client.destroy()
  logging.info('Received SIGTERM, shutting down.')
  process.exit(0)
}

// Login
await client.login(token)
