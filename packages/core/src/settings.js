import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
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

// تطبيق المنفذ فعلياً: يكتب ملف بيئة يقرأه systemd ثم يشغّل سكربت إعادة التشغيل.
// السكربت (root) يحدّث upstream في nginx ويعيد تشغيل خدمة الويب.
// يفشل بهدوء لو لم تُضبط صلاحية sudo — يبقى التغيير محفوظاً ويُطبَّق عند إعادة تشغيل يدوية.
export async function applyPortRuntime(port) {
  const envFile = process.env.PORT_ENV_FILE || path.join(process.cwd(), 'port.env');
  try {
    await writeFile(envFile, `PORT=${port}\n`, 'utf8');
  } catch (e) {
    return { wrote: false, restart: false, error: e.message };
  }

  const cmd = process.env.PORT_APPLY_CMD ?? 'sudo /usr/local/bin/jem-apply-port';
  if (!cmd) return { wrote: true, restart: false };

  try {
    const [bin, ...args] = cmd.split(' ').filter(Boolean);
    const child = spawn(bin, args, { detached: true, stdio: 'ignore' });
    child.unref(); // يستمر بعد انتهاء عملية الويب (التي ستُعاد)
    return { wrote: true, restart: true };
  } catch (e) {
    return { wrote: true, restart: false, error: e.message };
  }
}
