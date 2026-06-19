import { handler, ok, fail } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// حفظ تفضيلات المستخدم الحالي (اللغة) على حسابه.
export const POST = handler(async (req) => {
  const me = await requireUser();
  const { lang } = await req.json().catch(() => ({}));
  if (!['ar', 'en'].includes(lang)) return fail('لغة غير مدعومة', 400);
  await query('UPDATE users SET lang = :lang WHERE id = :id', { lang, id: me.id });
  return ok({ lang });
});
