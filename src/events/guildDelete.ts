import { logging } from '../utilities/logging.js'
import { EventStructure } from '../types/types'

const event: EventStructure<'guildDelete'> = {
  data: { name: 'guildDelete' },
  execute(guild) {
    logging.info(`[Discord]   Removed from guild: ${guild.name}.`)
    guild.client.websocket?.updateClientData()
  }
}
export const { data, execute } = event
