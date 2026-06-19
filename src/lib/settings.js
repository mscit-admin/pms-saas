import { query } from './db.js';

// إعدادات التطبيق (key/value) — منها رقم المنفذ القابل للضبط من الواجهة.

export async function getSetting(key, fallback = null) {
  const rows = await query('SELECT setting_value FROM app_settings WHERE setting_key = :k', { k: key });
  return rows[0]?.setting_value ?? fallback;
}

export async function getAllSettings() {
  const rows = await query('SELECT setting_key, setting_value FROM app_settings');
  const out = {};
  for (const r of rows) out[r.setting_key] = r.setting_value;
  return out;
}

export async function setSetting(key, value) {
  await query(
    `INSERT INTO app_settings (setting_key, setting_value) VALUES (:k, :v)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    { k: key, v: value == null ? null : String(value) }
  );
}
