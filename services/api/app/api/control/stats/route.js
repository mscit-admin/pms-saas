import { handler, ok } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { overviewStats } from '@/lib/orgs';

export const dynamic = 'force-dynamic';

// إحصاءات لوحة المعلومات.
export const GET = handler(async () => {
  await requireControlPermission('view_dashboard');
  return ok(await overviewStats());
});
