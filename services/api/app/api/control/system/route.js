import { handler, ok } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { dockerStats, mysqlServerStats } from '@/lib/system';

export const dynamic = 'force-dynamic';

// موارد المنصّة المشتركة: حاويات Docker + أداء خادم MySQL.
export const GET = handler(async () => {
  await requireControlPermission('view_dashboard');
  const [docker, mysql] = await Promise.all([
    dockerStats().catch(() => ({ available: false })),
    mysqlServerStats().catch(() => null),
  ]);
  return ok({ docker, mysql });
});
