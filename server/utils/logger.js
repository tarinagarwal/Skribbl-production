// Structured logging utility

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class Logger {
  constructor(level = "INFO") {
    this.level = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  }

  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    });
  }

  debug(message, meta) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.log(this.formatMessage("DEBUG", message, meta));
    }
  }

  info(message, meta) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.log(this.formatMessage("INFO", message, meta));
    }
  }

  warn(message, meta) {
    if (this.level <= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage("WARN", message, meta));
    }
  }

  error(message, meta) {
    if (this.level <= LOG_LEVELS.ERROR) {
      console.error(this.formatMessage("ERROR", message, meta));
    }
  }
}

// Create singleton instance
const logger = new Logger(process.env.LOG_LEVEL || "INFO");

export default logger;
