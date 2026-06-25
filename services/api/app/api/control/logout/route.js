import { handler, ok } from '@/lib/http';
import { clearControlCookie } from '@/lib/control-auth';

export const dynamic = 'force-dynamic';

export const POST = handler(async () => {
  await clearControlCookie();
  return ok({ ok: true });
});
