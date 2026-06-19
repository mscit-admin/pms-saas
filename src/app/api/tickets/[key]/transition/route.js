import { handler, ok, fail } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getTransitions, transitionIssue } from '@/lib/jira';
import { syncSingleIssue } from '@/lib/sync';

export const dynamic = 'force-dynamic';

// GET: الانتقالات المتاحة · POST: تنفيذ انتقال حالة
export const GET = handler(async (req, { params }) => {
  await requirePermission('act_tickets');
  const data = await getTransitions(params.key);
  const transitions = (data.transitions || []).map((tr) => ({ id: tr.id, name: tr.name, to: tr.to?.name }));
  return ok({ key: params.key, transitions });
});

export const POST = handler(async (req, { params }) => {
  await requirePermission('act_tickets');
  const { transitionId } = await req.json().catch(() => ({}));
  if (!transitionId) return fail('معرّف الانتقال مطلوب', 400);
  await transitionIssue(params.key, transitionId);
  await syncSingleIssue(params.key);
  return ok({ key: params.key, transitioned: true });
});
