require('dotenv').config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const base = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || '127.0.0.1',
  port: toNumber(process.env.DB_PORT, 3306),
  dialect: process.env.DB_DIALECT || 'mysql',
  dialectOptions: {
    charset: 'utf8mb4',
  },
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
    timestamps: true,
    underscored: true,
  },
  logging: false,
};

const database = process.env.DB_NAME || 'eventos';

module.exports = {
  development: {
    ...base,
    database,
  },
  test: {
    ...base,
    database: process.env.DB_TEST_NAME || `${database}_test`,
  },
  production: {
    ...base,
    database,
  },
};
