// حارس المصادقة لخدمة الـ API — يتحقّق من توقيع جلسة JWT في كوكي httpOnly.
// النقاط العامة (الدخول/المزامنة/Webhook/الصحة/أصول الهوية) تُستثنى؛
// أمنها الداخلي (أسرار المزامنة/الصلاحيات) يُفرض داخل المعالجات نفسها.
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'jem_session';

const PUBLIC = [
  '/api/auth/login',
  '/api/sync',
  '/api/webhook',
  '/api/health',
  '/api/branding',
];

function secretKey() {
  const s = process.env.SESSION_SECRET || process.env.SYNC_SECRET || 'dev-insecure-secret-change-me';
  return new TextEncoder().encode(s);
}

function isPublic(pathname) {
  return PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export function authGate() {
  return async (req, res, next) => {
    const pathname = req.path;
    if (req.method === 'OPTIONS' || isPublic(pathname)) return next();

    const token = readCookie(req.headers.cookie, SESSION_COOKIE);
    if (token) {
      try {
        await jwtVerify(token, secretKey());
        return next();
      } catch { /* توقيع غير صالح */ }
    }
    res.status(401).json({ ok: false, error: 'يجب تسجيل الدخول' });
  };
}
