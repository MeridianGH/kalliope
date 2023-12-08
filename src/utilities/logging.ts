/**
 * A class that holds static logging methods.
 */
export class logging {
  /**
   * Logs a message as an error log.
   * @param message The message to log.
   */
  static error(message: string) { console.error('%s \x1b[31m%s\x1b[0m', this.time(), message) }

  /**
   * Logs a message as a warning log.
   * @param message The message to log.
   */
  static warn(message: string) { console.warn('%s \x1b[33m%s\x1b[0m', this.time(), message) }

  /**
   * Logs a message as an info log.
   * @param message The message to log.
   */
  static info(message: string) { console.info('%s \x1b[36m%s\x1b[0m', this.time(), message) }

  /**
   * Logs a message as a success log.
   * @param message The message to log.
   */
  static success(message: string) { console.log('%s \x1b[32m%s\x1b[0m', this.time(), message) }

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
