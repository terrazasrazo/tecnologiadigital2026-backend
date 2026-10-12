import pino from 'pino';
import { config } from '../config/index.js';

const isDev = config.env === 'development';

const level = config.env === 'test' ? 'silent' : config.logLevel;

export const logger = pino({
  level,
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: isDev ? undefined : { pid: process.pid },
  timestamp: !isDev ? pino.stdTimeFunctions.isoTime : undefined,
});
