import { handler, ok, fail } from '@/lib/http';
import { verifyControlLogin, setControlCookie } from '@/lib/control-auth';

export const dynamic = 'force-dynamic';

// دخول المشرف الأعلى — حساب من قاعدة التحكّم (منفصل عن مستخدمي المستأجرين).
export const POST = handler(async (req) => {
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) return fail('اسم المستخدم وكلمة المرور مطلوبان', 400);
  const admin = await verifyControlLogin(username, password);
  if (!admin) return fail('بيانات الدخول غير صحيحة', 401);
  await setControlCookie({ sub: admin.id, username: admin.username });
  return ok({ username: admin.username });
});
