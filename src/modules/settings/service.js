import { SETTING_KEYS } from '../../db/models/index.js';
import {
  getNumberSetting,
  getStringSetting,
  setSetting,
} from '../../services/settings.service.js';

const METRICS = ['talks', 'hours', 'both'];

/** Configuración actual de constancias (umbral de elegibilidad). */
export async function getCertificateSettings() {
  const [metric, minTalks, minHours] = await Promise.all([
    getStringSetting(SETTING_KEYS.certificateMetric, 'talks'),
    getNumberSetting(SETTING_KEYS.certificateMinTalks, 1),
    getNumberSetting(SETTING_KEYS.certificateMinHours, 0),
  ]);

  return {
    certificate: {
      metric: METRICS.includes(metric) ? metric : 'talks',
      minTalks,
      minHours,
    },
  };
}

/** Actualiza (parcialmente) la configuración de constancias. */
export async function updateCertificateSettings(data) {
  const writes = [];
  if (data.metric !== undefined) {
    writes.push(setSetting(SETTING_KEYS.certificateMetric, data.metric));
  }
  if (data.minTalks !== undefined) {
    writes.push(setSetting(SETTING_KEYS.certificateMinTalks, data.minTalks));
  }
  if (data.minHours !== undefined) {
    writes.push(setSetting(SETTING_KEYS.certificateMinHours, data.minHours));
  }
  await Promise.all(writes);
  return getCertificateSettings();
}
