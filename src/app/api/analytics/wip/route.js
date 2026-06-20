import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getWipOverTime } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

// تدفّق العمل عبر الزمن (لقطات WIP اليومية حسب الحالة).
export const GET = handler(async (req) => {
  await requirePermission('view_managerial');
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') || '30', 10);
  const data = await getWipOverTime({ days });
  return ok(data);
});
