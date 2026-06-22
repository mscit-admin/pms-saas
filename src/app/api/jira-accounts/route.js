import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { listAccounts, createAccount, getAccountCompanies, setAccountCompanies } from '@/lib/jiraAccounts';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// قائمة حسابات جيرا (بلا توكن) مع شركاتها المرتبطة.
export const GET = handler(async () => {
  await requirePermission('manage_companies');
  const accounts = await listAccounts();
  const out = [];
  for (const a of accounts) {
    out.push({
      id: a.id, label: a.label, baseUrl: a.baseUrl, email: a.email,
      jql: a.jql, searchPath: a.searchPath, pageSize: a.pageSize, isActive: a.isActive,
      hasToken: !!a.apiToken, companyIds: await getAccountCompanies(a.id),
    });
  }
  return ok({ accounts: out });
});

export const POST = handler(async (req) => {
  const me = await requirePermission('manage_companies');
  const body = await req.json().catch(() => ({}));
  const a = await createAccount(body);
  if (Array.isArray(body.companyIds)) await setAccountCompanies(a.id, body.companyIds.map(Number));
  await logAudit({ action: 'jira_account_create', actorId: me.id, actorName: me.username, targetType: 'jira_account', targetId: String(a.id), detail: a.label, ip: clientIp(req) });
  return ok(a);
});
