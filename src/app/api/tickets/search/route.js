import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// بحث سريع في التذاكر (المفتاح/الملخّص) — لشريط البحث العام (Ctrl+K).
export const GET = handler(async (req) => {
  await requirePermission('view_operational');
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return ok({ items: [] });
  const like = `%${q}%`;
  const rows = await query(
    `SELECT issue_key, summary, status, project_key, assignee_name
     FROM tickets
     WHERE issue_key LIKE :like OR summary LIKE :like
     ORDER BY (UPPER(issue_key) = :exact) DESC, jira_updated_at DESC
     LIMIT 8`,
    { like, exact: q.toUpperCase() }
  );
  return ok({ items: rows.map((r) => ({ key: r.issue_key, summary: r.summary, status: r.status, project: r.project_key, assignee: r.assignee_name })) });
});
