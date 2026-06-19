import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getFlow } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

// تدفّق العمل والاختناقات: WIP حسب المرحلة + أقدم العناصر العالقة.
export const GET = handler(async () => {
  await requirePermission('view_managerial');
  const data = await getFlow();
  return ok(data);
});
