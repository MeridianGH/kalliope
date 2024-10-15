import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponent,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  Message
} from 'discord.js'
import fs from 'fs'
import path from 'path'
import { iconURL } from '../events/ready.js'
import { logging } from './logging.js'
import { Player, TrackInfo, UnresolvedTrackInfo, SponsorBlockSegmentsLoaded } from 'lavalink-client'
import { createCanvas } from '@napi-rs/canvas'
import { decode, Image } from 'imagescript'
import fetch from 'node-fetch'

/**
 * Builds a simple embed object with default settings used as a parameter in message functions.
 * @param content The content the embed should contain.
 * @param ephemeral If the embed should be ephemeral.
 * @returns An object compatible with most discord.js send functions.
 */
export function simpleEmbed(content: string, ephemeral = false): { ephemeral: boolean, embeds: EmbedBuilder[] } {
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
 * @param content The content the embed should contain.
 * @param ephemeral If the embed should be ephemeral.
 * @returns An object compatible with most discord.js send functions.
 */
export function errorEmbed(content: string, ephemeral = false): { ephemeral: boolean, embeds: EmbedBuilder[] } {
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

// noinspection JSUnusedGlobalSymbols
/**
 * Returns a promise that resolves after the specified amount of seconds.
 * @param seconds The time to wait until promise resolution.
 * @returns The promise to await.
 */
export function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

/**
 * Truncates a string with an ellipsis if the string's length is greater than the given number.
 * @param string The string to truncate.
 * @param length The maximum string length.
 * @returns The truncated string.
 */
export function truncateString(string: string, length: number): string {
  if (string.length > length) {
    return string.slice(0, length - 1) + '…'
  }
  return string
}

/**
 * Converts milliseconds to a formatted time string.
 * @param ms The milliseconds to convert.
 * @returns A string in HH:MM:SS format.
 */
export function msToHMS(ms: number | null | undefined): string {
  if (!ms) { return 'Unknown duration' }
  let totalSeconds = ms / 1000
  const hours = Math.floor(totalSeconds / 3600).toString()
  totalSeconds %= 3600
  const minutes = Math.floor(totalSeconds / 60).toString()
  const seconds = Math.floor(totalSeconds % 60).toString()
  return hours === '0' ? `${minutes}:${seconds.padStart(2, '0')}` : `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`
}

/**
 * Converts a formatted time string to milliseconds.
 * @param time A string in HH:MM:SS format.
 * @returns Amount of milliseconds.
 */
export function timeToMs(time: string): number {
  const times = time.split(':')
  let seconds = 0
  let secondsInUnit = 1
  while (times.length > 0) {
    seconds += secondsInUnit * parseInt(times.pop()!)
    secondsInUnit *= 60
  }
  return seconds * 1000
}

/**
 * Returns the formatted duration for a track.
 * @param trackInfo The track info.
 * @returns The formatted string.
 */
export function durationOrLive(trackInfo: TrackInfo | UnresolvedTrackInfo) {
  return trackInfo.isStream ? '🔴 Live' : msToHMS(trackInfo.duration)
}

/**
 * Returns a text string used for music embed footers.
 * @param player The active player.
 * @returns The formatted string.
 */
export function formatMusicFooter(player: Player) {
  const settings = player.get('settings')
  let footer = `Repeat: ${player.repeatMode === 'queue' ? '🔁 Queue' : player.repeatMode === 'track' ? '🔂 Track' : '❌'}`
  footer += ` | Autoplay: ${settings.autoplay ? '✅' : '❌'}`
  if (settings.sponsorblockSupport) { footer += ` | SponsorBlock: ${settings.sponsorblock ? '✅' : '❌'}` }
  return footer
}

/**
 * Converts a clamped RGB array to a HEX code.
 * @param color The RGB array to convert.
 * @returns A HEX string.
 */
function rgbToHEX(color: Uint8ClampedArray) {
  return '#' + ((1 << 24) + (color[0] << 16) + (color[1] << 8) + color[2]).toString(16).slice(1)
}

/**
 * Converts a HEX color to an RGB array.
 * @param color The color to convert.
 * @returns A clamped RGB array.
 */
function hexToRGB(color: string): Uint8ClampedArray {
  const rgb = parseInt(color.substring(1), 16)
  const r = rgb >> 16
  const g = rgb - (r << 16) >> 8
  const b = rgb - (r << 16) - (g << 8)
  return new Uint8ClampedArray([r, g, b])
}

/**
 * Changes a color until it is different enough from the reference color.
 * Alternates between darkening and brightening until a color is found.
 * @param color The color to change.
 * @param reference The reference color.
 * @param brighten Whether to start brightening or not. Default is false (start with darkening).
 * @returns A HEX color that is not similar to the reference color.
 */
function preventSimilarColor(color: string, reference: string, brighten = false): string {
  // eslint-disable-next-line jsdoc/require-jsdoc
  function changeColor(color: string, reference: string, brighten: boolean, recursionDepth = 0, originalColor = color) {
    const stepSize = 20
    const maxDepth = Math.ceil(255 / stepSize)
    if (recursionDepth + 1 >= maxDepth) { return changeColor(originalColor, reference, !brighten) }

    const clrRGB = hexToRGB(color)
    const refRGB = hexToRGB(reference)
    const difference = Math.abs(clrRGB[0] - refRGB[0]) + Math.abs(clrRGB[1] - refRGB[1]) + Math.abs(clrRGB[2] - refRGB[2])
    if (difference > 50) { return color }

    const changed = rgbToHEX(clrRGB.map((value) => brighten ? value + stepSize : value - stepSize))
    if (changed === color) { return changeColor(originalColor, reference, !brighten) }
    return changeColor(changed, reference, brighten, recursionDepth + 1, originalColor)
  }
  try {
    return changeColor(color, reference, brighten)
  } catch {
    return color
  }
}

/**
 * Fetches an image from URL and finds its dominant color.
 * @param url The image to quantize.
 * @returns A HEX color code.
 */
async function findDominantColor(url: string | null | undefined) {
  if (!url) { return '#000000' }
  const imageBuffer = Buffer.from(await fetch(url).then((response) => response.arrayBuffer()))
  const img = await decode(imageBuffer) as Image
  const hex = img.dominantColor(true, false)
  return `#${hex.toString(16).padStart(8, '0').substring(0, 6)}`
}

/**
 * Generates a timeline image for the currently playing track.
 * @param player The player to generate the image for.
 * @returns The image buffer or null, if there is no current track.
 */
export async function generateTimelineImage(player: Player) {
  const track = player.queue.current
  if (!track) { return null }

  const canvas = createCanvas(500, 50)
  const ctx = canvas.getContext('2d')
  const timelineHeight = 6

  const dominantColor = await findDominantColor(track.info.artworkUrl)

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, timelineHeight / 2, canvas.width, timelineHeight)
  ctx.fillStyle = preventSimilarColor(dominantColor, '#808080')
  ctx.fillRect(0, timelineHeight / 2, player.position / track.info.duration * canvas.width, timelineHeight)

  ctx.fillStyle = preventSimilarColor('#ff8000', dominantColor, true)
  for (const segment of (track.pluginInfo.clientData?.segments ?? []) as SponsorBlockSegmentsLoaded['segments']) {
    const start = segment.start / track.info.duration * canvas.width
    const end = segment.end / track.info.duration * canvas.width
    ctx.fillRect(start, timelineHeight / 2, end - start, timelineHeight)
  }

  ctx.beginPath()
  const circlePosition = Math.min(Math.max(timelineHeight, player.position / track.info.duration * canvas.width), canvas.width - timelineHeight)
  ctx.arc(circlePosition, timelineHeight, timelineHeight, 0, 2 * Math.PI)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 16px Arial'
  ctx.textBaseline = 'top'
  ctx.textAlign = 'start'
  ctx.fillText(msToHMS(player.position), 0, timelineHeight * 2)
  ctx.textAlign = 'end'
  ctx.fillText(msToHMS(track.info.duration), canvas.width, timelineHeight * 2)

  return canvas.toBuffer('image/png')
}

/**
 * Recursively searches a directory for all contained files.
 * @param directory The path of the directory to search (starting at project root).
 * @param [_files] Contains the array of found files.
 * @returns Array of absolute path URLs to all files in a directory.
 */
export function getFilesRecursively(directory: string, _files?: string[]): string[] {
  const dirPath = path.join(process.cwd(), 'dist', directory)
  const contents = fs.readdirSync(dirPath)
  _files = _files ?? []
  for (const file of contents) {
    const absolute = path.join(dirPath, file)
    if (fs.statSync(absolute).isDirectory()) {
      getFilesRecursively(absolute, _files)
    } else if (file.endsWith('.js')) {
      _files.push('file://' + absolute)
    }
  }
  return _files
}

/**
 * Adds music control buttons to a discord.js message.
 * @param message The message object.
 * @param player The player of the corresponding guild.
 * @returns A promise that resolves when the function is completed.
 */
export async function addMusicControls(message: Message, player: Player): Promise<void> {
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
    .setURL('https://kalliope.cc/dashboard')
    .setLabel('Dashboard')
    .setStyle(ButtonStyle.Link)

  await message.edit({
    components: [
      new ActionRowBuilder<ButtonBuilder>().setComponents([
        previousButton,
        pauseButton,
        skipButton,
        stopButton,
        dashboardButton
      ])
    ]
  })

  const collector = message.createMessageComponentCollector({ idle: 300000 })
  const collectors = player.get('collectors')
  collectors.push(collector)
  player.set('collectors', collectors)

  const onCollect = async (buttonInteraction: ButtonInteraction<'cached'>) => {
    if (buttonInteraction.member.voice.channel?.id !== player.voiceChannelId) {
      await buttonInteraction.reply(errorEmbed('You need to be in the same voice channel as the bot to use this command!', true))
      return
    }

    switch (buttonInteraction.customId) {
      case 'previous': {
        if (player.position > 5000) {
          await player.seek(0)
          await buttonInteraction.deferUpdate()
          break
        }
        try {
          if (player.queue.previous.length === 0) {
            await buttonInteraction.reply(errorEmbed('You can\'t use the command `/previous` right now!', true))
            return
          }
          const track = player.queue.previous.shift()!
          await player.play({ track: track })
          await player.queue.add(player.queue.previous.shift()!, 0)
          await buttonInteraction.reply(simpleEmbed(`⏮️ Playing previous track \`#0\`: **${track.info.title}**.`, true))
        } catch {
          await player.seek(0)
          await buttonInteraction.deferUpdate()
        }
        break
      }
      case 'pause': {
        if (player.paused) {
          await player.resume()
        } else {
          await player.pause()
        }
        await buttonInteraction.reply(simpleEmbed(player.paused ? '⏸️ Paused.' : '▶️ Resumed.', true))
        break
      }
      case 'skip': {
        if (player.queue.tracks.length === 0) {
          if (player.get('settings').autoplay) {
            // await player.skip(0, false)
            await player.stopPlaying(false, true)
            await buttonInteraction.reply(simpleEmbed('⏭️ Skipped', true))
            break
          }
          await player.destroy()
          await buttonInteraction.reply(simpleEmbed('⏹️ Stopped', true))
          message.client.websocket?.clearPlayer(message.guild!.id)
          return
        }
        await player.skip()
        await buttonInteraction.reply(simpleEmbed('⏭️ Skipped', true))
        break
      }
      case 'stop': {
        await player.destroy()
        await buttonInteraction.reply(simpleEmbed('⏹️ Stopped', true))
        message.client.websocket?.clearPlayer(message.guild!.id)
        return
      }
    }
    message.client.websocket?.updatePlayer(player)
  }
  collector.on('collect', (buttonInteraction: ButtonInteraction<'cached'>) => void onCollect(buttonInteraction))

  const onEnd = async () => {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const fetchedMessage = await message.fetch(true).catch((e: unknown) => { logging.warn(`[Discord]   Failed to edit message components: ${e}`) })
    if (!fetchedMessage) { return }
    await fetchedMessage.edit({ components: [new ActionRowBuilder<ButtonBuilder>().setComponents(fetchedMessage.components[0].components.map((component: ButtonComponent) => ButtonBuilder.from(component.toJSON()).setDisabled(true)))] })
  }
  collector.on('end', () => void onEnd())
}
