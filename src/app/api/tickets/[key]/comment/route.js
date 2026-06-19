import { handler, ok, fail } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { addComment } from '@/lib/jira';

export const dynamic = 'force-dynamic';

// إضافة تعليق على تذكرة في جيرا.
export const POST = handler(async (req, { params }) => {
  await requirePermission('act_tickets');
  const { body } = await req.json().catch(() => ({}));
  if (!body || !String(body).trim()) return fail('نص التعليق مطلوب', 400);
  await addComment(params.key, String(body).trim());
  return ok({ key: params.key, commented: true });
});
