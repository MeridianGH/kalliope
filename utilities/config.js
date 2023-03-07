import { existsSync, readFileSync } from 'fs'
import { logging } from './logging.js'

const file = new URL('../config.json', import.meta.url)
if (!existsSync(file)) {
  logging.error('[Process]   Failed to locate config. Make sure a config.json is present in the root directory.')
  process.exit()
}
// noinspection JSCheckFunctionSignatures
const config = JSON.parse(readFileSync(file))

export const { token, appId, papisid, psid, geniusClientToken } = config
