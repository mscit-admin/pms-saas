import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getFlow } from '@/lib/analytics';
import { getUserScope } from '@/lib/companies';

export const dynamic = 'force-dynamic';

// تدفّق العمل والاختناقات: WIP حسب المرحلة + أقدم العناصر العالقة.
export const GET = handler(async () => {
  const me = await requirePermission('view_managerial');
  const scope = await getUserScope(me.id);
  const data = await getFlow({ scope });
  return ok(data);
});
