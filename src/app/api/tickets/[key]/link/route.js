import { handler, ok, fail } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { createIssueLink } from '@/lib/jira';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// إنشاء اعتمادية/حجب بين هذه التذكرة وأخرى.
// relation: 'blocked_by' (هذه التذكرة تعتمد على/محجوبة بـ otherKey) أو 'blocks' (هذه التذكرة تحجب otherKey).
export const POST = handler(async (req, { params }) => {
  const me = await requirePermission('act_tickets');
  const { relation, otherKey } = await req.json().catch(() => ({}));
  const other = String(otherKey || '').trim().toUpperCase();
  if (!other) return fail('مفتاح التذكرة الأخرى مطلوب', 400);
  if (!['blocks', 'blocked_by'].includes(relation)) return fail('علاقة غير صحيحة', 400);
  if (other === params.key.toUpperCase()) return fail('لا يمكن ربط التذكرة بنفسها', 400);

  // الدلالة: outwardIssue يحجب inwardIssue
  const inwardKey = relation === 'blocks' ? other : params.key;
  const outwardKey = relation === 'blocks' ? params.key : other;
  await createIssueLink({ type: 'Blocks', inwardKey, outwardKey });
  await logAudit({ action: 'ticket_link', actorId: me.id, actorName: me.username, targetType: 'ticket', targetId: params.key, detail: `${relation}:${other}`, ip: clientIp(req) });
  return ok({ linked: true, relation, otherKey: other });
});
