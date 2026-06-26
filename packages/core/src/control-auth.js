// مصادقة المشرف الأعلى (Super-admin) — منفصلة عن مصادقة المستأجرين:
//   - جلسة بكوكي مستقلّ pms_control_session وسرّ مستقلّ CONTROL_SESSION_SECRET
//   - الحسابات في قاعدة التحكّم (control_admins) لا في أي مستأجر
// بذلك لا تتداخل جلسة المشرف مع جلسات المستأجرين إطلاقاً.
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { controlQuery } from './control-db.js';
import { getRequestCookie, queueResponseCookie } from './cookies.js';

export const CONTROL_COOKIE = 'pms_control_session';
const SESSION_HOURS = 8;

function secretKey() {
  const s = process.env.CONTROL_SESSION_SECRET
    || process.env.SESSION_SECRET
    || 'dev-insecure-control-secret-change-me';
  return new TextEncoder().encode(s);
}

export async function signControlSession(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey());
}

export async function verifyControlSession(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload;
  } catch {
    return null;
  }
}

export async function setControlCookie(payload) {
  const token = await signControlSession({ ...payload, su: true });
  queueResponseCookie(CONTROL_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function clearControlCookie() {
  queueResponseCookie(CONTROL_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

// المشرف الحالي من الكوكي (طازج من قاعدة التحكّم) أو null.
export async function getCurrentSuperAdmin() {
  const token = getRequestCookie(CONTROL_COOKIE);
  if (!token) return null;
  const payload = await verifyControlSession(token);
  if (!payload?.sub || !payload.su) return null;
  const rows = await controlQuery(
    'SELECT id, username, full_name FROM control_admins WHERE id = :id AND is_active = 1',
    { id: payload.sub }
  );
  const a = rows[0];
  if (!a) return null;
  return { id: a.id, username: a.username, fullName: a.full_name };
}

export class ControlAuthError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export async function requireSuperAdmin() {
  const admin = await getCurrentSuperAdmin();
  if (!admin) throw new ControlAuthError('يلزم تسجيل دخول المشرف الأعلى', 401);
  return admin;
}

// ---- إدارة حسابات المشرفين ----
export async function verifyControlLogin(username, password) {
  const rows = await controlQuery(
    'SELECT id, username, password_hash, is_active FROM control_admins WHERE username = :u',
    { u: username }
  );
  const a = rows[0];
  if (!a || !a.is_active) return null;
  if (!(await bcrypt.compare(password, a.password_hash))) return null;
  return { id: a.id, username: a.username };
}

// بذر/تحديث مشرف أعلى (idempotent) — يُستدعى من الإقلاع والسكربت.
export async function seedControlAdmin({ username, password, fullName = 'Super Admin' }) {
  if (!username || !password) return false;
  const hash = await bcrypt.hash(password, 10);
  await controlQuery(
    `INSERT INTO control_admins (username, full_name, password_hash)
     VALUES (:u, :f, :h)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), full_name = VALUES(full_name), is_active = 1`,
    { u: username, f: fullName, h: hash }
  );
  return true;
}
