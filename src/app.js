import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { storage } from './services/storage.service.js';
import { routes } from './routes/index.js';
import { notFoundHandler, errorHandler, AppError } from './middlewares/error.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.cors.origins.length === 0) {
          return callback(null, true);
        }
        if (config.cors.origins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new AppError('Origen no permitido por CORS', 403, 'CORS_FORBIDDEN'));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(
    pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === `${config.basePath}/health` } }),
  );

  app.use(
    storage.publicPath,
    express.static(storage.root, {
      maxAge: config.isProduction ? '7d' : 0,
      index: false,
    }),
  );

  app.use(config.basePath || '/', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
