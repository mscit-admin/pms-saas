import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { assignIssue } from '@/lib/jira';
import { syncSingleIssue } from '@/lib/sync';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// إسناد تذكرة لمسؤول (accountId) أو إلغاء الإسناد (accountId=null).
export const POST = handler(async (req, { params }) => {
  await requirePermission('act_tickets');
  const { accountId } = await req.json().catch(() => ({}));
  await assignIssue(params.key, accountId || null);
  await syncSingleIssue(params.key); // حدّث قاعدتنا فوراً
  return ok({ key: params.key, assigned: accountId || null });
});

// قائمة المسؤولين المعروفين (من تذاكرنا) لاختيار الإسناد دون دليل مستخدمين كامل.
export const GET = handler(async () => {
  await requirePermission('act_tickets');
  const rows = await query(
    `SELECT DISTINCT assignee_account_id AS accountId, assignee_name AS name
     FROM tickets WHERE assignee_account_id IS NOT NULL ORDER BY assignee_name ASC`
  );
  return ok({ assignees: rows });
});
