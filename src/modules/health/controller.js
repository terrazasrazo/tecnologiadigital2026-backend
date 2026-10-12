import { config } from '../../config/index.js';
import { isDatabaseUp } from '../../config/database.js';

export async function getHealth(req, res) {
  const dbUp = await isDatabaseUp();

  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: config.env,
    db: dbUp ? 'up' : 'down',
  });
}
