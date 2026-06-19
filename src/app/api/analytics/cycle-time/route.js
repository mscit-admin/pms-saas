import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getCycleTime, getStageResidence } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

// زمن الدورة + زمن البقاء في كل مرحلة، خلال آخر ?days=90 يوماً.
export const GET = handler(async (req) => {
  await requirePermission('view_managerial');
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') || '90', 10);

  const [cycle, stages] = await Promise.all([
    getCycleTime({ days }),
    getStageResidence({ days }),
  ]);

  return ok({ days, cycle, stages });
});
