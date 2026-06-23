import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getExecutiveSummary } from '@/lib/analytics';
import { getUserScope } from '@/lib/companies';

export const dynamic = 'force-dynamic';

// الملخص التنفيذي للوحة الإدارية.
export const GET = handler(async () => {
  const me = await requirePermission('view_managerial');
  const scope = await getUserScope(me.id);
  const summary = await getExecutiveSummary({ scope });
  return ok(summary);
});
