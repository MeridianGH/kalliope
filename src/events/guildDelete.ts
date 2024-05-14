import { logging } from '../utilities/logging.js'
import { EventStructure } from '../types/types'

export const { data, execute }: EventStructure<'guildDelete'> = {
  data: { name: 'guildDelete' },
  async execute(guild) {
    logging.info(`[Discord]   Removed from guild: ${guild.name}.`)
    guild.client.websocket?.updateClientData()
  }
}
