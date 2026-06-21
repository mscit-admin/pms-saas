import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { listCompanies, createCompany, listUsersBrief } from '@/lib/companies';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requirePermission('manage_companies');
  const [companies, users] = await Promise.all([listCompanies(), listUsersBrief()]);
  return ok({ companies, users });
});

export const POST = handler(async (req) => {
  const me = await requirePermission('manage_companies');
  const { name } = await req.json().catch(() => ({}));
  const c = await createCompany(name);
  await logAudit({ action: 'company_create', actorId: me.id, actorName: me.username, targetType: 'company', targetId: String(c.id), detail: c.name, ip: clientIp(req) });
  return ok(c);
});
