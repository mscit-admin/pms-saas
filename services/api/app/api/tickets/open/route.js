import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getExceptions } from '@/lib/exceptions';
import { getUserScope } from '@/lib/companies';

export const dynamic = 'force-dynamic';

// كل التذاكر المفتوحة (للمتابعة مع الفريق) — ليست المُستثناة فقط. فلتر تاريخ اختياري.
export const GET = handler(async (req) => {
  const me = await requirePermission('view_operational');
  const scope = await getUserScope(me.id);
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const items = await getExceptions({ from, to, all: true, scope });
  return ok({ total: items.length, items });
});
