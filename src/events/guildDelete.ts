import { logging } from '../utilities/logging.js'
import { EventStructure } from '../types/types.js'

export const { data, execute }: EventStructure<'guildDelete'> = {
  data: { name: 'guildDelete' },
  async execute(guild) {
    logging.info(`Removed from guild: ${guild.name}.`)
    guild.client.websocket?.updateClientData()
  }
}
