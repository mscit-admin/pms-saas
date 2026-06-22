import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { updateAccount, deleteAccount, setAccountCompanies } from '@/lib/jiraAccounts';
import { ping } from '@/lib/jira';
import { getAccount } from '@/lib/jiraAccounts';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (req, { params }) => {
  const me = await requirePermission('manage_companies');
  const body = await req.json().catch(() => ({}));
  await updateAccount(params.id, body);
  if (Array.isArray(body.companyIds)) await setAccountCompanies(params.id, body.companyIds.map(Number));
  await logAudit({ action: 'jira_account_update', actorId: me.id, actorName: me.username, targetType: 'jira_account', targetId: String(params.id), ip: clientIp(req) });
  return ok({ updated: true });
});

export const DELETE = handler(async (req, { params }) => {
  const me = await requirePermission('manage_companies');
  await deleteAccount(params.id);
  await logAudit({ action: 'jira_account_delete', actorId: me.id, actorName: me.username, targetType: 'jira_account', targetId: String(params.id), ip: clientIp(req) });
  return ok({ deleted: true });
});

// اختبار اتصال حساب محفوظ.
export const POST = handler(async (req, { params }) => {
  await requirePermission('manage_companies');
  const acct = await getAccount(params.id);
  if (!acct) return ok({ ok: false, error: 'الحساب غير موجود' });
  try {
    const me = await ping(acct);
    return ok({ ok: true, displayName: me.displayName });
  } catch (e) {
    return ok({ ok: false, error: e.message });
  }
});
