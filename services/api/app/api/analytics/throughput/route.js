import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getThroughput } from '@/lib/analytics';
import { getUserScope } from '@/lib/companies';

export const dynamic = 'force-dynamic';

// الإنتاجية الأسبوعية + تنبؤ استنزاف المتراكم.
export const GET = handler(async (req) => {
  const me = await requirePermission('view_managerial');
  const scope = await getUserScope(me.id);
  const url = new URL(req.url);
  const weeks = parseInt(url.searchParams.get('weeks') || '12', 10);
  const data = await getThroughput({ weeks, scope });
  return ok(data);
});
