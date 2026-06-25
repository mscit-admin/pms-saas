import { handler, ok } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { PERMISSIONS, PERMISSION_GROUPS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requireUser();
  return ok({ items: PERMISSIONS, groups: PERMISSION_GROUPS });
});
