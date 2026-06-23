import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { listDependencyLog } from '@/lib/dependencies';

export const dynamic = 'force-dynamic';

// سجلّ الاعتماديات المُلغاة — للمراجعة. صلاحية مخصّصة.
export const GET = handler(async () => {
  await requirePermission('view_dependency_log');
  const items = await listDependencyLog(200);
  return ok({ items });
});
