import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { getSetting, setSetting, getAllSettings } from './settings.js';

// تخزين أصول الهوية (شعار/خلفية/أيقونة) كملفات في uploads/، مع تسجيل النوع
// في app_settings (brand_<type> = mime). الملفات تبقى خارج git.

export const BRAND_TYPES = ['logo', 'background', 'login_background', 'favicon'];
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
  const int = (v, d) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);
  const bool = (v, d) => (v == null ? d : v === '1' || v === 1 || v === 'true');
  return {
    logo: Boolean(s.brand_logo),
    background: Boolean(s.brand_background),            // خلفية التطبيق
    loginBackground: Boolean(s.brand_login_background), // خلفية شاشة الدخول
    favicon: Boolean(s.brand_favicon),
    appName: s.app_name || '',
    appSubtitle: s.app_subtitle || '',
    pageSize: int(s.page_size, 25),
    appBgDim: int(s.app_bg_dim, 85),
    loginBgDim: int(s.login_bg_dim, 85),
    appBgShow: bool(s.app_bg_show, true),
    loginBgShow: bool(s.login_bg_show, true),
    ts: s.brand_ts || '0',
  };
}
