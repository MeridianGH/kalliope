import { logging } from '../utilities/logging.js'
import { EventStructure } from '../types/types'

export const { data, execute }: EventStructure<'guildCreate'> = {
  data: { name: 'guildCreate' },
  execute(guild) {
    logging.info(`[Discord]   Joined a new guild: ${guild.name}.`)
    guild.client.websocket?.updateClientData()
  }
}
