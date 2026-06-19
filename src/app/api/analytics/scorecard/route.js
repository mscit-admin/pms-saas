import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getProjectScorecard } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

// بطاقة صحة المشاريع (RAG) + نسبة التسليم في الموعد.
export const GET = handler(async () => {
  await requirePermission('view_managerial');
  const items = await getProjectScorecard();
  return ok({ items });
});
