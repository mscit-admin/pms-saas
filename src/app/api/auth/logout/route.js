import { handler, ok } from '@/lib/http';
import { clearSessionCookie, getCurrentUser } from '@/lib/auth';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req) => {
  const user = await getCurrentUser();
  await clearSessionCookie();
  if (user) await logAudit({ category: 'login', action: 'logout', actorId: user.id, actorName: user.username, ip: clientIp(req) });
  return ok({ ok: true });
});
