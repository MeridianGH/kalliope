import 'dotenv/config'

export enum levels {
  none,
  info,
  warn,
  error,
  debug
}

/**
 * A class that holds static logging methods.
 */
export class logging {
  static level = levels[process.env.LOGGING_LEVEL] ?? levels.warn
  /**
   * Logs a message as an error log.
   * @param args The message to log.
   */
  static error(...args: unknown[]) {
    if (this.level >= levels.error) { console.error('%s \x1b[31m%s\x1b[0m', this.time(), ...args) }
  }

  /**
   * Logs a message as a warning log.
   * @param args The message to log.
   */
  static warn(...args: unknown[]) {
    if (this.level >= levels.warn) { console.warn('%s \x1b[33m%s\x1b[0m', this.time(), ...args) }
  }

  /**
   * Logs a message as an info log.
   * @param args The message to log.
   */
  static info(...args: unknown[]) {
    if (this.level >= levels.info) { console.info('%s \x1b[34m%s\x1b[0m', this.time(), ...args) }
  }

  /**
   * Logs a message as a success log.
   * @param args The message to log.
   */
  static success(...args: unknown[]) {
    console.log('%s \x1b[32m%s\x1b[0m', this.time(), ...args)
  }

  /**
   * Logs a debug message (or object).
   * @param args The message to log.
   */
  static debug(...args: unknown[]) {
    if (this.level >= levels.debug) { console.log('%s \x1b[36m%s\x1b[0m', this.time(), ...args) }
  }

  /**
   * Returns the current time in the used format for logging.
   * @ignore
   * @returns The time string.
   */
  static time(): string {
    const now = new Date()
    return `[${now.toLocaleString()}]`
  }
}
