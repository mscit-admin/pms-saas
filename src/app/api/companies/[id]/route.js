import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { renameCompany, deleteCompany } from '@/lib/companies';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (req, { params }) => {
  const me = await requirePermission('manage_companies');
  const { name } = await req.json().catch(() => ({}));
  await renameCompany(params.id, name);
  await logAudit({ action: 'company_update', actorId: me.id, actorName: me.username, targetType: 'company', targetId: String(params.id), detail: name, ip: clientIp(req) });
  return ok({ updated: true });
});

export const DELETE = handler(async (req, { params }) => {
  const me = await requirePermission('manage_companies');
  await deleteCompany(params.id);
  await logAudit({ action: 'company_delete', actorId: me.id, actorName: me.username, targetType: 'company', targetId: String(params.id), ip: clientIp(req) });
  return ok({ deleted: true });
});
