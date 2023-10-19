import fs from 'fs'
import { logging } from './logging.js'

const file = new URL('../config.json', import.meta.url)
if (!fs.existsSync(file)) {
  logging.error('[Process]   Failed to locate config. Make sure a config.json is present in the root directory.')
  process.exit()
}

// noinspection JSCheckFunctionSignatures
/**
 * Config object containing login and API tokens
 * @type {{token: string, appId: string, papisid: string, psid: string, geniusClientToken: string}}
 */
const config = JSON.parse(fs.readFileSync(file))

export const { token, appId, papisid, psid, geniusClientToken } = config
