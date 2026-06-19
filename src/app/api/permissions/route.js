import { handler, ok } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requireUser();
  return ok({ items: PERMISSIONS });
});
