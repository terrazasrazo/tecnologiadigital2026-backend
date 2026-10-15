import * as settingsService from './service.js';

export async function show(_req, res) {
  const result = await settingsService.getCertificateSettings();
  res.status(200).json(result);
}

export async function update(req, res) {
  const result = await settingsService.updateCertificateSettings(req.body);
  res.status(200).json(result);
}
