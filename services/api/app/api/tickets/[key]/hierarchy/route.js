import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getHierarchy } from '@/lib/hierarchy';

export const dynamic = 'force-dynamic';

// شجرة التذكرة نزولاً (Epic → Task → Subtask) بتفاصيلها.
export const GET = handler(async (req, { params }) => {
  await requirePermission('view_operational');
  const tree = await getHierarchy(params.key, 3);
  return ok({ tree });
});
