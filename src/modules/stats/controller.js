import * as statsService from './service.js';

export async function summary(_req, res) {
  const result = await statsService.getStats();
  res.status(200).json(result);
}
