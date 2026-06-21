import { handler, ok, fail } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { createIssueLink, deleteIssueLink, getIssueLinks } from '@/lib/jira';
import { describeLinks } from '@/lib/normalize';
import { logManualCancel } from '@/lib/dependencies';
import { query } from '@/lib/db';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// روابط الاعتمادية الحالية لهذه التذكرة (للعرض/الحذف).
export const GET = handler(async (req, { params }) => {
  await requirePermission('act_tickets');
  const issue = await getIssueLinks(params.key);
  return ok({ links: describeLinks(issue) });
});

// حذف رابط اعتمادية بمعرّفه — مع تسجيله في سجلّ المراجعة (من ألغى/متى/السبب).
export const DELETE = handler(async (req, { params }) => {
  const me = await requirePermission('act_tickets');
  const { linkId, reason, otherKey, depends } = await req.json().catch(() => ({}));
  if (!linkId) return fail('معرّف الرابط مطلوب', 400);
  const other = String(otherKey || '').trim().toUpperCase();

  // اتجاه الحافة: depends=true ⇒ هذه التذكرة تعتمد على الأخرى (الأخرى حاجبة)
  const blocker = other ? (depends ? other : params.key) : params.key;
  const blocked = other ? (depends ? params.key : other) : params.key;
  // حالة/مشروع التذكرة الحاجبة من قاعدة البيانات (إن وُجدت)
  let status = null; let project = null;
  try {
    const rows = await query('SELECT status, project_key FROM tickets WHERE issue_key = :k', { k: blocker });
    if (rows[0]) { status = rows[0].status; project = rows[0].project_key; }
  } catch { /* تجاهل */ }

  await deleteIssueLink(String(linkId));
  if (other) {
    await logManualCancel({ blocker, blocked, status, project, linkId: String(linkId), actorName: me.fullName || me.username, reason: reason ? String(reason).slice(0, 512) : null });
  }
  // أزِل الحافة من جدول العمل فوراً (لا تنتظر المزامنة)
  try { await query('DELETE FROM ticket_blocks WHERE link_id = :l', { l: String(linkId) }); } catch { /* تجاهل */ }

  await logAudit({ action: 'ticket_unlink', actorId: me.id, actorName: me.username, targetType: 'ticket', targetId: params.key, detail: `link:${linkId}${reason ? ` · ${String(reason).slice(0, 120)}` : ''}`, ip: clientIp(req) });
  return ok({ removed: true });
});

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
