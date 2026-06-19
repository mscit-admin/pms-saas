import { handler, ok } from '@/lib/http';
import { clearSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const POST = handler(async () => {
  clearSessionCookie();
  return ok({ ok: true });
});
