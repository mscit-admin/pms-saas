import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { deleteProject } from '@/lib/companies';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const DELETE = handler(async (req, { params }) => {
  const me = await requirePermission('manage_companies');
  await deleteProject(params.id);
  await logAudit({ action: 'project_delete', actorId: me.id, actorName: me.username, targetType: 'project', targetId: String(params.id), ip: clientIp(req) });
  return ok({ deleted: true });
});
