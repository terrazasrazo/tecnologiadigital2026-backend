import { createApp } from './app.js';
import { config, validateConfig } from './config/index.js';
import { connectDatabase, closeDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

async function start() {
  const missing = validateConfig();

  if (missing.length > 0) {
    logger.warn({ missing }, 'Variables de entorno de base de datos ausentes');
  }

  try {
    await connectDatabase();
    logger.info('Conexión a la base de datos establecida');
  } catch (error) {
    logger.error(
      { err: error },
      'No se pudo conectar a la base de datos; el servidor continuará con /health degradado',
    );
  }

  const app = createApp();

  const server = app.listen(config.port, config.host, () => {
    logger.info(
      `Servidor escuchando en http://${config.host}:${config.port}${config.basePath} (${config.env})`,
    );
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Recibida señal de apagado, cerrando servidor...');
    server.close(async () => {
      try {
        await closeDatabase();
        logger.info('Conexión a la base de datos cerrada');
      } catch (error) {
        logger.error({ err: error }, 'Error al cerrar la base de datos');
      }
      process.exit(0);
    });
    setTimeout(() => {
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
