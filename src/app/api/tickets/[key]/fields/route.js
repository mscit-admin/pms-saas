import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getEditMeta, updateIssueFields } from '@/lib/jira';
import { syncSingleIssue } from '@/lib/sync';

export const dynamic = 'force-dynamic';

// الحقول الشائعة التي قد تطلبها validators الانتقالات (نعرضها للتعديل).
const CURATED = ['labels', 'priority', 'components', 'fixVersions', 'duedate'];

// GET: حقول قابلة للتعديل (المختارة + أي حقل إلزامي في editmeta)
export const GET = handler(async (req, { params }) => {
  await requirePermission('act_tickets');
  const meta = await getEditMeta(params.key);
  const fields = meta.fields || {};
  const out = [];
  for (const [id, f] of Object.entries(fields)) {
    if (!CURATED.includes(id) && !f.required) continue;
    out.push({
      id,
      name: f.name,
      required: !!f.required,
      type: f.schema?.type || 'string',
      itemType: f.schema?.items || null,
      allowedValues: (f.allowedValues || []).map((v) => ({
        id: v.id,
        label: v.value || v.name || v.label || v.id,
      })),
    });
  }
  return ok({ key: params.key, fields: out });
});

// POST: تحديث الحقول (fields جاهزة بصيغة جيرا) ثم إعادة مزامنة التذكرة
export const POST = handler(async (req, { params }) => {
  await requirePermission('act_tickets');
  const { fields } = await req.json().catch(() => ({}));
  await updateIssueFields(params.key, fields || {});
  await syncSingleIssue(params.key);
  return ok({ key: params.key, updated: true });
});
