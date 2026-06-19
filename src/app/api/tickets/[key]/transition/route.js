import { handler, ok, fail } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getTransitions, transitionIssue } from '@/lib/jira';
import { syncSingleIssue } from '@/lib/sync';

export const dynamic = 'force-dynamic';

// GET: الانتقالات المتاحة + الحقول الإلزامية لكل انتقال
export const GET = handler(async (req, { params }) => {
  await requirePermission('act_tickets');
  const data = await getTransitions(params.key);
  const transitions = (data.transitions || []).map((tr) => ({
    id: tr.id,
    name: tr.name,
    to: tr.to?.name,
    // الحقول الإلزامية فقط (لتقليل التعقيد في الواجهة)
    fields: Object.entries(tr.fields || {})
      .filter(([, f]) => f.required)
      .map(([fid, f]) => ({
        id: fid,
        name: f.name,
        type: f.schema?.type || 'string',
        allowedValues: (f.allowedValues || []).map((v) => ({
          id: v.id,
          label: v.value || v.name || v.label || v.id,
        })),
      })),
  }));
  return ok({ key: params.key, transitions });
});

// POST: تنفيذ انتقال مع حقول جاهزة (fields) إن لزم
export const POST = handler(async (req, { params }) => {
  await requirePermission('act_tickets');
  const { transitionId, fields } = await req.json().catch(() => ({}));
  if (!transitionId) return fail('معرّف الانتقال مطلوب', 400);
  await transitionIssue(params.key, transitionId, fields || undefined);
  await syncSingleIssue(params.key);
  return ok({ key: params.key, transitioned: true });
});
