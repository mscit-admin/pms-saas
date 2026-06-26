// إعدادات النسخ الاحتياطي التلقائي — مخزّنة في control_settings (مفتاح/قيمة).
//   enabled            تفعيل الجدولة
//   cyclesPerMonth     عدد دورات النسخ في الشهر (1..30) — منه تُحسب الفترة
//   storage            internal (وحدة تخزين داخلية) | external (مسار خارجي)
//   dir                مجلّد الوجهة داخل الحاوية (يُربط بوحدة/مسار في compose)
//   retention          عدد النسخ المحفوظة لكل عميل (الأقدم يُحذف)
//   lastRunAt          آخر تشغيل (ISO) — لاحتساب الاستحقاق
import { getControlPool, controlQuery } from './control-db.js';

const FIELDS = {
  enabled: { key: 'backup_enabled', def: false, type: 'bool' },
  cyclesPerMonth: { key: 'backup_cyclesPerMonth', def: 4, type: 'int' },
  storage: { key: 'backup_storage', def: 'internal', type: 'str' },
  dir: { key: 'backup_dir', def: '/backups', type: 'str' },
  retention: { key: 'backup_retention', def: 8, type: 'int' },
  includeControl: { key: 'backup_includeControl', def: false, type: 'bool' },
  lastRunAt: { key: 'backup_lastRunAt', def: '', type: 'str' },
};

export async function getBackupConfig() {
  const keys = Object.values(FIELDS).map((f) => f.key);
  const [rows] = await getControlPool().query(
    'SELECT setting_key AS k, setting_value AS v FROM control_settings WHERE setting_key IN (?)',
    [keys]
  );
  const byKey = {};
  for (const r of rows) byKey[r.k] = r.v;
  const out = {};
  for (const [name, f] of Object.entries(FIELDS)) {
    const raw = byKey[f.key];
    if (raw == null) { out[name] = f.def; continue; }
    out[name] = f.type === 'bool' ? (raw === '1' || raw === 'true')
      : f.type === 'int' ? (parseInt(raw, 10) || f.def) : raw;
  }
  // حدود آمنة
  out.cyclesPerMonth = Math.min(30, Math.max(1, out.cyclesPerMonth));
  out.retention = Math.min(365, Math.max(1, out.retention));
  if (!out.dir) out.dir = '/backups';
  return out;
}

async function put(key, value) {
  await controlQuery(
    `INSERT INTO control_settings (setting_key, setting_value) VALUES (:k, :v)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    { k: key, v: String(value) }
  );
}

export async function setBackupConfig(patch = {}) {
  for (const [name, f] of Object.entries(FIELDS)) {
    if (name === 'lastRunAt' || patch[name] === undefined) continue;
    const v = f.type === 'bool' ? (patch[name] ? '1' : '0') : String(patch[name]);
    await put(f.key, v);
  }
  return getBackupConfig();
}

export async function setBackupLastRun(iso) {
  await put('backup_lastRunAt', iso);
}

// فترة الدورة بالمللي ثانية من عدد الدورات الشهرية (الشهر ≈ 30 يوماً).
export function intervalMs(cyclesPerMonth) {
  return (30 * 24 * 60 * 60 * 1000) / Math.min(30, Math.max(1, cyclesPerMonth));
}
