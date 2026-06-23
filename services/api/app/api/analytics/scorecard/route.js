import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getProjectScorecard } from '@/lib/analytics';
import { getUserScope } from '@/lib/companies';

export const dynamic = 'force-dynamic';

// بطاقة صحة المشاريع (RAG) + نسبة التسليم في الموعد.
export const GET = handler(async () => {
  const me = await requirePermission('view_managerial');
  const scope = await getUserScope(me.id);
  const items = await getProjectScorecard({ scope });
  return ok({ items });
});
