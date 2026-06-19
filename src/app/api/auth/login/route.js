import { handler, ok, fail } from '@/lib/http';
import { query } from '@/lib/db';
import { verifyPassword, setSessionCookie } from '@/lib/auth';
import { verifyToken } from '@/lib/totp';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// تسجيل الدخول: اسم مستخدم + كلمة مرور (+ رمز TOTP إن كان 2FA مفعّلاً).
export const POST = handler(async (req) => {
  const ip = clientIp(req);
  const body = await req.json().catch(() => ({}));
  const { username, password, token } = body;
  if (!username || !password) return fail('اسم المستخدم وكلمة المرور مطلوبان', 400);

  const rows = await query(
    `SELECT id, username, password_hash, is_active, totp_enabled, totp_secret
     FROM users WHERE username = :u`,
    { u: username }
  );
  const user = rows[0];

  const logFail = (reason) => logAudit({
    category: 'login', action: 'login_failed', actorId: user?.id || null,
    actorName: username, detail: reason, ip,
  });

  // رسالة عامة لتفادي كشف وجود الحساب
  const invalid = async (reason) => { await logFail(reason); return fail('بيانات الدخول غير صحيحة', 401); };
  if (!user || !user.is_active) return invalid('user not found/inactive');

  const okPass = await verifyPassword(password, user.password_hash);
  if (!okPass) return invalid('bad password');

  // التحقق الثنائي
  if (user.totp_enabled) {
    if (!token) return ok({ needs2fa: true });
    if (!verifyToken(token, user.totp_secret)) { await logFail('bad 2fa'); return fail('رمز التحقق غير صحيح', 401); }
  }

  await setSessionCookie({ sub: user.id, username: user.username });
  await logAudit({ category: 'login', action: 'login_success', actorId: user.id, actorName: user.username, ip });
  return ok({ ok: true, username: user.username });
});
