// هوية المنصّة (لوحة المشرف) — تخزين الشعار/الأيقونة في قاعدة التحكّم.
import { controlQuery } from './control-db.js';
import { getControlSettings } from './control-settings.js';

export const CONTROL_BRAND_TYPES = ['logo', 'favicon', 'login_background'];
export const isControlBrandType = (t) => CONTROL_BRAND_TYPES.includes(t);

export async function saveControlAsset(type, buffer, mime) {
  await controlQuery(
    `INSERT INTO control_brand_assets (type, mime, data) VALUES (:t, :m, :d)
     ON DUPLICATE KEY UPDATE mime = VALUES(mime), data = VALUES(data)`,
    { t: type, m: mime, d: buffer }
  );
}

export async function readControlAsset(type) {
  const rows = await controlQuery('SELECT mime, data FROM control_brand_assets WHERE type = :t', { t: type });
  return rows[0] ? { mime: rows[0].mime, data: rows[0].data } : null;
}

export async function removeControlAsset(type) {
  await controlQuery('DELETE FROM control_brand_assets WHERE type = :t', { t: type });
}

// بيان الهوية: أي الأصول موجودة + ختم زمني للتخزين المؤقت + اسم/لون المنصّة.
export async function controlBrandManifest() {
  const rows = await controlQuery(
    'SELECT type, UNIX_TIMESTAMP(updated_at) AS ts FROM control_brand_assets'
  );
  const have = {};
  let ts = 0;
  for (const r of rows) { have[r.type] = true; ts = Math.max(ts, Number(r.ts) || 0); }
  const s = await getControlSettings();
  return {
    logo: !!have.logo,
    favicon: !!have.favicon,
    loginBackground: !!have.login_background,
    platformName: s.platformName,
    accent: s.accent,
    ts: String(ts),
  };
}
