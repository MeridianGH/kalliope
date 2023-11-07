import { logging } from '../utilities/logging.js'

export const { data, execute } = {
  data: { name: 'guildDelete' },
  async execute(guild) {
    logging.info(`Removed from guild: ${guild.name}.`)
    guild.client.websocket.updateClientData()
  }
}
