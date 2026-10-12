import { Sequelize } from 'sequelize';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

export const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: config.db.dialect,
  logging: config.db.logging ? (message) => logger.debug(message) : false,
  timezone: '+00:00',
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
    timestamps: true,
    underscored: true,
  },
  dialectOptions: {
    charset: 'utf8mb4',
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export async function connectDatabase() {
  await sequelize.authenticate();
}

export async function closeDatabase() {
  await sequelize.close();
}

export async function isDatabaseUp() {
  try {
    await sequelize.authenticate();
    return true;
  } catch {
    return false;
  }
}
