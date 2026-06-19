import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { getSetting, setSetting, getAllSettings } from './settings.js';

// تخزين أصول الهوية (شعار/خلفية/أيقونة) كملفات في uploads/، مع تسجيل النوع
// في app_settings (brand_<type> = mime). الملفات تبقى خارج git.

export const BRAND_TYPES = ['logo', 'background', 'favicon'];
const DIR = path.join(process.cwd(), 'uploads');

export function isBrandType(t) {
  return BRAND_TYPES.includes(t);
}

export async function saveAsset(type, buffer, mime) {
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, `brand_${type}`), buffer);
  await setSetting(`brand_${type}`, mime);
  await setSetting('brand_ts', String(Date.now()));
}

export async function readAsset(type) {
  const mime = await getSetting(`brand_${type}`);
  if (!mime) return null;
  try {
    const data = await readFile(path.join(DIR, `brand_${type}`));
    return { data, mime };
  } catch {
    return null;
  }
}

export async function removeAsset(type) {
  await setSetting(`brand_${type}`, null);
  await setSetting('brand_ts', String(Date.now()));
  try { await unlink(path.join(DIR, `brand_${type}`)); } catch { /* غير موجود */ }
}

export async function brandManifest() {
  const s = await getAllSettings();
  return {
    logo: Boolean(s.brand_logo),
    background: Boolean(s.brand_background),
    favicon: Boolean(s.brand_favicon),
    ts: s.brand_ts || '0',
  };
}
