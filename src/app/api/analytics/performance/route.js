import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getPerformance } from '@/lib/analytics';
import { getUserScope } from '@/lib/companies';

export const dynamic = 'force-dynamic';

// تقييم الأداء: درجات المسؤولين والمشاريع + مؤشّر عام.
export const GET = handler(async (req) => {
  const me = await requirePermission('view_managerial');
  const scope = await getUserScope(me.id);
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') || '90', 10);
  const data = await getPerformance({ days, scope });
  return ok(data);
});
