// ─── سیستم لاگ‌گذاری ساختاریافته ───

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, FATAL: 4,
};

const currentLevel = (): number => {
  const env = process.env.LOG_LEVEL?.toUpperCase() || '';
  return LOG_LEVELS[env as LogLevel] ?? (process.env.NODE_ENV === 'production' ? 2 : 0);
};

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  metadata?: Record<string, any>;
  service?: string;
  environment: string;
}

function formatLog(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry);
  }
  const colors: Record<LogLevel, string> = {
    DEBUG: '\x1b[36m', INFO: '\x1b[32m', WARN: '\x1b[33m', ERROR: '\x1b[31m', FATAL: '\x1b[35m',
  };
  const reset = '\x1b[0m';
  const c = colors[entry.level] || '';
  return `${c}[${entry.level}]${reset} ${entry.timestamp} ${entry.message}${entry.userId ? ` user=${entry.userId}` : ''}${entry.requestId ? ` req=${entry.requestId}` : ''}${entry.duration ? ` ${entry.duration}ms` : ''}${entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : ''}`;
}

function createLogEntry(level: LogLevel, message: string, meta?: Record<string, any>): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.NODE_ENV || 'development',
    service: 'erp-construction',
    ...meta,
  };
}

export const logger = {
  debug(message: string, meta?: Record<string, any>) {
    if (currentLevel() <= LOG_LEVELS.DEBUG) {
      const entry = createLogEntry('DEBUG', message, meta);
      console.debug(formatLog(entry));
    }
  },
  info(message: string, meta?: Record<string, any>) {
    if (currentLevel() <= LOG_LEVELS.INFO) {
      const entry = createLogEntry('INFO', message, meta);
      console.info(formatLog(entry));
    }
  },
  warn(message: string, meta?: Record<string, any>) {
    if (currentLevel() <= LOG_LEVELS.WARN) {
      const entry = createLogEntry('WARN', message, meta);
      console.warn(formatLog(entry));
    }
  },
  error(message: string, meta?: Record<string, any>) {
    if (currentLevel() <= LOG_LEVELS.ERROR) {
      const entry = createLogEntry('ERROR', message, meta);
      console.error(formatLog(entry));
    }
  },
  fatal(message: string, meta?: Record<string, any>) {
    const entry = createLogEntry('FATAL', message, meta);
    console.error(formatLog(entry));
  },
};

export function createRequestLogger(requestId: string, userId?: string) {
  return {
    debug(message: string, meta?: Record<string, any>) { logger.debug(message, { requestId, userId, ...meta }); },
    info(message: string, meta?: Record<string, any>) { logger.info(message, { requestId, userId, ...meta }); },
    warn(message: string, meta?: Record<string, any>) { logger.warn(message, { requestId, userId, ...meta }); },
    error(message: string, meta?: Record<string, any>) { logger.error(message, { requestId, userId, ...meta }); },
  };
}
