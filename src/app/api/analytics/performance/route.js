import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getPerformance } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

// تقييم الأداء: درجات المسؤولين والمشاريع + مؤشّر عام.
export const GET = handler(async (req) => {
  await requirePermission('view_managerial');
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') || '90', 10);
  const data = await getPerformance({ days });
  return ok(data);
});
