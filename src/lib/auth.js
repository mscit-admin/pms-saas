import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { query } from './db.js';

// المصادقة: تجزئة كلمات المرور (bcrypt) + جلسة JWT في كوكي httpOnly.
// JWT تُتحقَّق في الخادم (Node) وفي middleware (edge) عبر jose — متوافق مع الاثنين.

export const SESSION_COOKIE = 'jem_session';
const SESSION_HOURS = 12;

function secretKey() {
  const s = process.env.SESSION_SECRET || process.env.SYNC_SECRET || 'dev-insecure-secret-change-me';
  return new TextEncoder().encode(s);
}

// ---- كلمات المرور ----
export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}
export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// ---- JWT ----
export async function signSession(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey());
}

export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload;
  } catch {
    return null;
  }
}

// ---- كوكي الجلسة (في مسارات الخادم) ----
export async function setSessionCookie(payload) {
  const token = await signSession(payload);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_HOURS * 3600,
  });
}
export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

// ---- المستخدم الحالي + صلاحياته (من قاعدة البيانات، طازجة) ----
export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload?.sub) return null;

  const rows = await query(
    `SELECT id, username, full_name, email, is_active, totp_enabled
     FROM users WHERE id = :id AND is_active = 1`,
    { id: payload.sub }
  );
  const user = rows[0];
  if (!user) return null;

  const perms = await query(
    `SELECT DISTINCT rp.permission_key AS k
     FROM user_roles ur
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     WHERE ur.user_id = :id`,
    { id: user.id }
  );
  const roles = await query(
    `SELECT r.id, r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = :id`,
    { id: user.id }
  );

  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    email: user.email,
    totpEnabled: !!user.totp_enabled,
    roles: roles.map((r) => ({ id: r.id, name: r.name })),
    permissions: perms.map((p) => p.k),
  };
}

// حارس صلاحية: يرمي 401/403 بشكل قابل للالتقاط في handler
export class AuthError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError('يجب تسجيل الدخول', 401);
  return user;
}

export async function requirePermission(key) {
  const user = await requireUser();
  if (!user.permissions.includes(key)) {
    throw new AuthError('ليست لديك صلاحية لهذا الإجراء', 403);
  }
  return user;
}
