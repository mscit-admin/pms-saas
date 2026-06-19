import { handler, ok, fail } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/totp';

export const dynamic = 'force-dynamic';

// تأكيد التهيئة: تحقّق من الرمز ثم فعّل 2FA.
// (لا يوجد تعطيل ذاتي — التعطيل يتم بإعادة الضبط من المدير فقط.)
export const POST = handler(async (req) => {
  const user = await requireUser();
  const { token } = await req.json().catch(() => ({}));
  if (!token) return fail('الرمز مطلوب', 400);

  const rows = await query('SELECT totp_secret FROM users WHERE id = :id', { id: user.id });
  const secret = rows[0]?.totp_secret;
  if (!secret) return fail('ابدأ التهيئة أولاً', 400);
  if (!verifyToken(token, secret)) return fail('رمز التحقق غير صحيح', 401);

  await query('UPDATE users SET totp_enabled = 1 WHERE id = :id', { id: user.id });
  return ok({ enabled: true });
});
