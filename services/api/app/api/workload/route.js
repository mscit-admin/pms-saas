import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getTeamWorkload } from '@/lib/analytics';
import { getUserScope } from '@/lib/companies';

export const dynamic = 'force-dynamic';

// أعباء الفريق — أداة توازن، لا محاسبة فردية.
export const GET = handler(async () => {
  const me = await requirePermission('view_operational');
  const scope = await getUserScope(me.id);
  const items = await getTeamWorkload({ scope });
  return ok({ items });
});
