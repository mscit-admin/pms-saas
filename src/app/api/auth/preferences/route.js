import { handler, ok, fail } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// حفظ تفضيلات المستخدم الحالي (اللغة/الثيم) على حسابه.
export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  if (body.lang !== undefined) {
    if (!['ar', 'en'].includes(body.lang)) return fail('لغة غير مدعومة', 400);
    await query('UPDATE users SET lang = :lang WHERE id = :id', { lang: body.lang, id: me.id });
  }
  if (body.theme !== undefined) {
    if (!['light', 'dark'].includes(body.theme)) return fail('ثيم غير مدعوم', 400);
    await query('UPDATE users SET theme = :theme WHERE id = :id', { theme: body.theme, id: me.id });
  }
  return ok({ lang: body.lang, theme: body.theme });
});
