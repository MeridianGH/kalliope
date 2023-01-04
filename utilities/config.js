import { existsSync, readFileSync } from 'fs'
import { logging } from './logging.js'

const file = new URL('../config.json', import.meta.url)
if (!existsSync(file)) {
  logging.error('Failed to locate config. Make sure a config.json is present in the root directory.')
  process.exit()
}
const config = JSON.parse(readFileSync(file))

export const { token, appId, clientSecret, guildId, adminId, papisid, psid, geniusClientToken } = config
