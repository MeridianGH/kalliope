/**
 * A class that holds static logging methods.
 */
export class logging {
  /**
   * Logs a message as an error log.
   * @param message {string} The message to log.
   */
  static error(message) { console.error('%s \x1b[31m%s\x1b[0m', this.time(), message) }

  /**
   * Logs a message as a warning log.
   * @param message {string} The message to log.
   */
  static warn(message) { console.warn('%s \x1b[33m%s\x1b[0m', this.time(), message) }

  /**
   * Logs a message as an info log.
   * @param message {string} The message to log.
   */
  static info(message) { console.info('%s \x1b[36m%s\x1b[0m', this.time(), message) }

  /**
   * Logs a message as a success log.
   * @param message {string} The message to log.
   */
  static success(message) { console.log('%s \x1b[32m%s\x1b[0m', this.time(), message) }

  /**
   * Returns the current time in the used format for logging.
   * @hidden
   * @returns {string} The time string.
   */
  static time() {
    const now = new Date()
    return `[${now.toLocaleString()}]`
  }
}
