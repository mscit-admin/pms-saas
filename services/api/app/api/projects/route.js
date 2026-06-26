import { handler, ok, fail } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { createProject } from '@/lib/companies';
import { logAudit, clientIp } from '@/lib/audit';
import { getCurrentOrg } from '@/lib/tenancy';
import { assertProjectQuota } from '@/lib/orgs';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req) => {
  const me = await requirePermission('manage_companies');
  const org = getCurrentOrg();
  if (org) await assertProjectQuota(org.slug);
  const { companyId, name, jiraKey, accountId } = await req.json().catch(() => ({}));
  if (!companyId) return fail('الشركة مطلوبة', 400);
  const p = await createProject(companyId, name, jiraKey, accountId || null);
  await logAudit({ action: 'project_create', actorId: me.id, actorName: me.username, targetType: 'project', targetId: String(p.id), detail: `${p.name} (${p.jiraKey})`, ip: clientIp(req) });
  return ok(p);
});
