import { Setting, SETTING_KEYS } from '../db/models/index.js';

const DEFAULTS = {
  [SETTING_KEYS.attendanceOpensBeforeEndMinutes]: 20,
  [SETTING_KEYS.attendanceClosesAfterEndMinutes]: 10,
  [SETTING_KEYS.certificateMetric]: 'talks',
  [SETTING_KEYS.certificateMinTalks]: 1,
  [SETTING_KEYS.certificateMinHours]: 0,
};

function parseStoredValue(raw) {
  const trimmed = String(raw).trim();
  if (trimmed.startsWith('"') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return raw;
    }
  }
  return raw;
}

export async function getSetting(key) {
  const setting = await Setting.findOne({ where: { key } });
  if (!setting || setting.value === null || setting.value === '') {
    return DEFAULTS[key] ?? null;
  }
  return parseStoredValue(setting.value);
}

export async function getNumberSetting(key, fallback = null) {
  const value = await getSetting(key);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getStringSetting(key, fallback = null) {
  const value = await getSetting(key);
  return value === null || value === undefined ? fallback : String(value);
}
