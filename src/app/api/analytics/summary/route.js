import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getExecutiveSummary } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

// الملخص التنفيذي للوحة الإدارية.
export const GET = handler(async () => {
  await requirePermission('view_managerial');
  const summary = await getExecutiveSummary();
  return ok(summary);
});
