import { handler, ok, fail } from '@/lib/http';
import { query } from '@/lib/db';
import { verifyPassword, setSessionCookie } from '@/lib/auth';
import { verifyToken } from '@/lib/totp';

export const dynamic = 'force-dynamic';

// تسجيل الدخول: اسم مستخدم + كلمة مرور (+ رمز TOTP إن كان 2FA مفعّلاً).
export const POST = handler(async (req) => {
  const body = await req.json().catch(() => ({}));
  const { username, password, token } = body;
  if (!username || !password) return fail('اسم المستخدم وكلمة المرور مطلوبان', 400);

  const rows = await query(
    `SELECT id, username, password_hash, is_active, totp_enabled, totp_secret
     FROM users WHERE username = :u`,
    { u: username }
  );
  const user = rows[0];
  // رسالة عامة لتفادي كشف وجود الحساب
  const invalid = () => fail('بيانات الدخول غير صحيحة', 401);
  if (!user || !user.is_active) return invalid();

  const okPass = await verifyPassword(password, user.password_hash);
  if (!okPass) return invalid();

  // التحقق الثنائي
  if (user.totp_enabled) {
    if (!token) return ok({ needs2fa: true });
    if (!verifyToken(token, user.totp_secret)) return fail('رمز التحقق غير صحيح', 401);
  }

  await setSessionCookie({ sub: user.id, username: user.username });
  return ok({ ok: true, username: user.username });
});
