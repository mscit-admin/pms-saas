import { handler, ok, fail } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { addComment } from '@/lib/jira';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// إضافة تعليق على تذكرة في جيرا.
export const POST = handler(async (req, { params }) => {
  const me = await requirePermission('act_tickets');
  const { body } = await req.json().catch(() => ({}));
  if (!body || !String(body).trim()) return fail('نص التعليق مطلوب', 400);
  await addComment(params.key, String(body).trim());
  await logAudit({ action: 'ticket_comment', actorId: me.id, actorName: me.username, targetType: 'ticket', targetId: params.key, ip: clientIp(req) });
  return ok({ key: params.key, commented: true });
});
