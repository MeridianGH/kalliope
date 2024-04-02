import { logging } from '../utilities/logging.js'
import { WebSocketConnector } from '../utilities/websocket.js'
import { EventStructure } from '../types/types.js'
import 'dotenv/config'

export let iconURL: string
export const { data, execute }: EventStructure<'ready'> = {
  data: { name: 'ready', once: true },
  async execute(client) {
    const now = new Date()
    const date = now.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' - ' + now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    logging.success(`${client.user.tag} connected to Discord at ${date}`)
    iconURL = client.user.displayAvatarURL()
    if (process.env.STANDALONE !== 'true') {
      client.websocket = new WebSocketConnector(client)
      client.websocket?.connect()
    } else {
      logging.info('[WebSocket] Skipping WebSocket setup due to standalone configuration.')
    }
  }
}
