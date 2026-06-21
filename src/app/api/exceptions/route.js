import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getExceptions, getExceptionCounts } from '@/lib/exceptions';
import { getUserScope } from '@/lib/companies';

export const dynamic = 'force-dynamic';

// التبويب التشغيلي: قائمة الاستثناءات + العدّادات. فلتر تاريخ اختياري ?from=&to=
export const GET = handler(async (req) => {
  const me = await requirePermission('view_operational');
  const scope = await getUserScope(me.id);
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const [items, counts] = await Promise.all([
    getExceptions({ from, to, scope }),
    getExceptionCounts({ scope }),
  ]);

  return ok({ counts, total: items.length, items });
});
