// noinspection JSUnusedGlobalSymbols, JSCheckFunctionSignatures

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js'
import fs from 'fs'
import path from 'path'
import { iconURL } from '../events/ready.js'
import { logging } from './logging.js'

/**
 * Builds a simple embed object with default settings used as a parameter in message functions.
 * @param {string} content The content the embed should contain.
 * @param {boolean} ephemeral If the embed should be ephemeral.
 * @returns {{ephemeral: boolean, embeds: EmbedBuilder[]}} An object compatible with most discord.js send functions.
 */
export function simpleEmbed(content, ephemeral = false) {
  return {
    embeds: [
      new EmbedBuilder()
        .setDescription(content)
        .setFooter({ text: 'Kalliope', iconURL: iconURL })
    ],
    ephemeral: ephemeral
  }
}

/**
 * Builds a simple embed object with error settings used as a parameter in message functions.
 * @param {string} content The content the embed should contain.
 * @param {boolean} ephemeral If the embed should be ephemeral.
 * @returns {{ephemeral: boolean, embeds: EmbedBuilder[]}} An object compatible with most discord.js send functions.
 */
export function errorEmbed(content, ephemeral = false) {
  return {
    embeds: [
      new EmbedBuilder()
        .setDescription(content)
        .setFooter({ text: 'Kalliope', iconURL: iconURL })
        .setColor([255, 0, 0])
    ],
    ephemeral: ephemeral
  }
}

/**
 * Returns a promise that resolves after the specified amount of seconds.
 * @param {number} seconds The time to wait until promise resolution.
 * @returns {Promise<void>} The promise to await.
 */
export function sleep(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

/**
 * Converts milliseconds to a formatted time string.
 * @param {number} ms The milliseconds to convert.
 * @returns {string} A string in HH:MM:SS format.
 */
export function msToHMS(ms) {
  let totalSeconds = ms / 1000
  const hours = Math.floor(totalSeconds / 3600).toString()
  totalSeconds %= 3600
  const minutes = Math.floor(totalSeconds / 60).toString()
  const seconds = Math.floor(totalSeconds % 60).toString()
  return hours === '0' ? `${minutes}:${seconds.padStart(2, '0')}` : `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`
}

/**
 * Converts a formatted time string to milliseconds.
 * @param {string} time A string in HH:MM:SS format.
 * @returns {number} Amount of milliseconds.
 */
export function timeToMs(time) {
  const times = time.split(':')
  let seconds = 0; let secondsInUnit = 1
  while (times.length > 0) {
    seconds += secondsInUnit * parseInt(times.pop())
    secondsInUnit *= 60
  }
  return seconds * 1000
}

/**
 * Recursively searches a directory for all contained files.
 * @param {string} directory Specifies the path of the directory to search.
 * @param {string[]} [_files] Contains the array of found files.
 * @returns {string[]} Array of all files in a directory.
 */
export function getFilesRecursively(directory, _files) {
  const contents = fs.readdirSync(directory)
  _files = _files ?? []
  for (const file of contents) {
    const absolute = path.join(directory, file)
    if (fs.statSync(absolute).isDirectory()) {
      getFilesRecursively(absolute, _files)
    } else {
      _files.push(absolute)
    }
  }
  return _files
}

/**
 * Adds music control buttons to a discord.js message.
 * @param {any} message The message object.
 * @param {any} player The player of the corresponding guild.
 * @returns {Promise<any>} A promise that resolves when the function is completed.
 */
export async function addMusicControls(message, player) {
  const previousButton = new ButtonBuilder()
    .setCustomId('previous')
    .setEmoji('⏮️')
    .setStyle(ButtonStyle.Secondary)
  const pauseButton = new ButtonBuilder()
    .setCustomId('pause')
    .setEmoji('⏯')
    .setStyle(ButtonStyle.Secondary)
  const skipButton = new ButtonBuilder()
    .setCustomId('skip')
    .setEmoji('⏭️')
    .setStyle(ButtonStyle.Secondary)
  const stopButton = new ButtonBuilder()
    .setCustomId('stop')
    .setEmoji('⏹️')
    .setStyle(ButtonStyle.Secondary)
  const dashboardButton = new ButtonBuilder()
    .setURL(`https://test.xyz/dashboard/${message.guildId}`)
    .setLabel('Dashboard')
    .setStyle(ButtonStyle.Link)

  await message.edit({ components: [new ActionRowBuilder().setComponents([previousButton, pauseButton, skipButton, stopButton, dashboardButton])] })

  const collector = message.createMessageComponentCollector({ idle: 300000 })
  collector.on('collect', async (buttonInteraction) => {
    if (buttonInteraction.member.voice.channel?.id !== player.voiceChannelId) { return await buttonInteraction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true)) }

    switch (buttonInteraction.customId) {
      case 'previous': {
        if (player.position > 5000) {
          await player.seek(0)
          await buttonInteraction.deferUpdate()
          break
        }
        try {
          if (player.queue.previous.length === 0) { return await buttonInteraction.reply(errorEmbed('You can\'t use the command `/previous` right now!', true)) }
          const track = player.queue.previous.shift()
          await player.play({ track: track })
          await player.queue.add(player.queue.previous.shift(), 0)
          await buttonInteraction.reply(simpleEmbed(`⏮️ Playing previous track \`#0\`: **${track.info.title}**.`, true))
        } catch (e) {
          await player.seek(0)
          await buttonInteraction.deferUpdate()
        }
        break
      }
      case 'pause': {
        player.paused ? await player.resume() : await player.pause()
        await buttonInteraction.reply(simpleEmbed(player.paused ? '⏸️ Paused.' : '▶️ Resumed.', true))
        break
      }
      case 'skip': {
        if (player.queue.tracks.length === 0) {
          await player.destroy()
          await buttonInteraction.reply(simpleEmbed('⏹️ Stopped', true))
          break
        }
        await player.skip()
        await buttonInteraction.reply(simpleEmbed('⏭️ Skipped', true))
        break
      }
      case 'stop': {
        await player.destroy()
        await buttonInteraction.reply(simpleEmbed('⏹️ Stopped', true))
        break
      }
    }
    message.client.websocket.updatePlayer(player)
  })
  collector.on('end', async () => {
    const fetchedMessage = await message.fetch(true).catch((e) => { logging.warn(`Failed to edit message components: ${e}`) })
    await fetchedMessage?.edit({ components: [new ActionRowBuilder().setComponents(fetchedMessage.components[0].components.map((component) => ButtonBuilder.from(component.toJSON()).setDisabled(true)))] })
  })
}
