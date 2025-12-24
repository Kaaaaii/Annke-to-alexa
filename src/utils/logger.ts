import { config } from '../config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

const COLORS = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
    reset: '\x1b[0m'
};

class Logger {
    private minLevel: number;

    constructor(level: LogLevel = 'info') {
        this.minLevel = LOG_LEVELS[level];
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= this.minLevel;
    }

    private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
        const timestamp = new Date().toISOString();
        const color = COLORS[level];
        const reset = COLORS.reset;
        const levelStr = level.toUpperCase().padEnd(5);

        let formattedArgs = '';
        if (args.length > 0) {
            formattedArgs = ' ' + args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
        }

        return `${color}[${timestamp}] ${levelStr}${reset} ${message}${formattedArgs}`;
    }

    debug(message: string, ...args: any[]): void {
        if (this.shouldLog('debug')) {
            console.log(this.formatMessage('debug', message, ...args));
        }
    }

    info(message: string, ...args: any[]): void {
        if (this.shouldLog('info')) {
            console.log(this.formatMessage('info', message, ...args));
        }
    }

    warn(message: string, ...args: any[]): void {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, ...args));
        }
    }

    error(message: string, ...args: any[]): void {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, ...args));
        }
    }
}

export const logger = new Logger(config.logLevel);
