import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getThroughput } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

// الإنتاجية الأسبوعية + تنبؤ استنزاف المتراكم.
export const GET = handler(async (req) => {
  await requirePermission('view_managerial');
  const url = new URL(req.url);
  const weeks = parseInt(url.searchParams.get('weeks') || '12', 10);
  const data = await getThroughput({ weeks });
  return ok(data);
});
