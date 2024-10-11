import { logging } from '../utilities/logging.js'
import { EventStructure } from '../types/types'

const event: EventStructure<'guildCreate'> = {
  data: { name: 'guildCreate' },
  execute(guild) {
    logging.info(`[Discord]   Joined a new guild: ${guild.name}.`)
    guild.client.websocket?.updateClientData()
  }
}
export const { data, execute } = event
