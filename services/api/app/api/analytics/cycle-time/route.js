import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getCycleTime, getStageResidence } from '@/lib/analytics';
import { getUserScope } from '@/lib/companies';

export const dynamic = 'force-dynamic';

// زمن الدورة + زمن البقاء في كل مرحلة، خلال آخر ?days=90 يوماً.
export const GET = handler(async (req) => {
  const me = await requirePermission('view_managerial');
  const scope = await getUserScope(me.id);
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') || '90', 10);

  const [cycle, stages] = await Promise.all([
    getCycleTime({ days, scope }),
    getStageResidence({ days, scope }),
  ]);

  return ok({ days, cycle, stages });
});
