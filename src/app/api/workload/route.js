import { handler, ok } from '@/lib/http';
import { getTeamWorkload } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

// أعباء الفريق — أداة توازن، لا محاسبة فردية.
export const GET = handler(async () => {
  const items = await getTeamWorkload();
  return ok({ items });
});
