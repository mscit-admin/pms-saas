import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { query } from '@/lib/db';
import { getUserScope, scopeAnd } from '@/lib/companies';

export const dynamic = 'force-dynamic';

// بحث سريع في التذاكر (المفتاح/الملخّص) — لشريط البحث العام (Ctrl+K).
export const GET = handler(async (req) => {
  const me = await requirePermission('view_operational');
  const scope = await getUserScope(me.id);
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return ok({ items: [] });
  const like = `%${q}%`;
  const sc = scopeAnd(scope, '');
  const rows = await query(
    `SELECT issue_key, summary, status, project_key, assignee_name
     FROM tickets
     WHERE (issue_key LIKE :like OR summary LIKE :like)${sc.sql}
     ORDER BY (UPPER(issue_key) = :exact) DESC, jira_updated_at DESC
     LIMIT 8`,
    { like, exact: q.toUpperCase(), ...sc.params }
  );
  return ok({ items: rows.map((r) => ({ key: r.issue_key, summary: r.summary, status: r.status, project: r.project_key, assignee: r.assignee_name })) });
});
