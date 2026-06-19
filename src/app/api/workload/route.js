import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getTeamWorkload } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

// أعباء الفريق — أداة توازن، لا محاسبة فردية.
export const GET = handler(async () => {
  await requirePermission('view_operational');
  const items = await getTeamWorkload();
  return ok({ items });
});
