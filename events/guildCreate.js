import { logging } from '../utilities/logging.js'

export const { data, execute } = {
  data: { name: 'guildCreate' },
  async execute(guild) {
    logging.info(`Joined a new guild: ${guild.name}.`)
    guild.client.websocket.updateClientData()
  }
}
