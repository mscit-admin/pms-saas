import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { listAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// سجلّات الدخول/التدقيق — للمخوّلين بـ view_audit. فلترة: category/action/from/to + ترقيم.
export const GET = handler(async (req) => {
  await requirePermission('view_audit');
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(200, Math.max(5, parseInt(url.searchParams.get('pageSize') || '50', 10)));

  const result = await listAudit({
    category: url.searchParams.get('category') || undefined,
    action: url.searchParams.get('action') || undefined,
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return ok({ ...result, page, pageSize });
});
