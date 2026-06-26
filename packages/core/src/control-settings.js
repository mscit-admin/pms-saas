// إعدادات المنصّة (هوية لوحة المشرف) — مفتاح/قيمة في قاعدة التحكّم.
import { controlQuery } from './control-db.js';

export const SETTING_KEYS = ['platformName', 'accent', 'logoUrl'];

export const DEFAULT_SETTINGS = {
  platformName: 'PMS Control',
  accent: '#2f81f7',
  logoUrl: '',
};

export async function getControlSettings() {
  const rows = await controlQuery('SELECT setting_key AS k, setting_value AS v FROM control_settings');
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (SETTING_KEYS.includes(r.k)) out[r.k] = r.v ?? '';
  return out;
}

export async function setControlSettings(patch = {}) {
  for (const k of SETTING_KEYS) {
    if (patch[k] === undefined) continue;
    await controlQuery(
      `INSERT INTO control_settings (setting_key, setting_value) VALUES (:k, :v)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      { k, v: String(patch[k] ?? '') }
    );
  }
  return getControlSettings();
}
