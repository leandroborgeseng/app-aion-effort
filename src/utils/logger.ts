// src/utils/logger.ts
// Logger estruturado para produção

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatLog(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context || {},
      error: error
        ? {
            message: error.message,
            stack: this.isDevelopment ? error.stack : undefined,
            code: (error as any).code,
          }
        : undefined,
    };
  }

  private output(entry: LogEntry) {
    if (this.isDevelopment) {
      // Em desenvolvimento, usar console colorido
      const colors: Record<LogLevel, string> = {
        info: '\x1b[36m', // Cyan
        warn: '\x1b[33m', // Yellow
        error: '\x1b[31m', // Red
        debug: '\x1b[90m', // Gray
      };
      const reset = '\x1b[0m';
      console.log(`${colors[entry.level]}${entry.level.toUpperCase()}${reset}`, entry);
    } else {
      // Em produção, JSON estruturado
      console.log(JSON.stringify(entry));
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.output(this.formatLog('info', message, context));
  }

  warn(message: string, context?: Record<string, any>) {
    this.output(this.formatLog('warn', message, context));
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.output(this.formatLog('error', message, context, error));
  }

  debug(message: string, context?: Record<string, any>) {
    if (this.isDevelopment) {
      this.output(this.formatLog('debug', message, context));
    }
  }
}

export const logger = new Logger();

// Compatibilidade com código existente
export const log = logger;

