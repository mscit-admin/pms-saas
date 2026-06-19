import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getExceptions, getExceptionCounts } from '@/lib/exceptions';

export const dynamic = 'force-dynamic';

// التبويب التشغيلي: قائمة الاستثناءات + العدّادات. فلتر تاريخ اختياري ?from=&to=
export const GET = handler(async (req) => {
  await requirePermission('view_operational');
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const [items, counts] = await Promise.all([
    getExceptions({ from, to }),
    getExceptionCounts(),
  ]);

  return ok({ counts, total: items.length, items });
});
