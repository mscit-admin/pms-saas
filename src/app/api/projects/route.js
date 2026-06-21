import { handler, ok, fail } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { createProject } from '@/lib/companies';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req) => {
  const me = await requirePermission('manage_companies');
  const { companyId, name, jiraKey } = await req.json().catch(() => ({}));
  if (!companyId) return fail('الشركة مطلوبة', 400);
  const p = await createProject(companyId, name, jiraKey);
  await logAudit({ action: 'project_create', actorId: me.id, actorName: me.username, targetType: 'project', targetId: String(p.id), detail: `${p.name} (${p.jiraKey})`, ip: clientIp(req) });
  return ok(p);
});
