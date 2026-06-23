import { handler, ok } from '@/lib/http';
import { query } from '@/lib/db';
import { getJiraSettings } from '@/lib/jira-settings';

export const dynamic = 'force-dynamic';

// بيانات تعريفية للواجهة: رابط جيرا الأساسي (لروابط التذاكر) + آخر مزامنة ناجحة.
export const GET = handler(async () => {
  const [rows, jira] = await Promise.all([
    query(
      `SELECT finished_at, issues_processed
       FROM sync_log WHERE status = 'success'
       ORDER BY finished_at DESC LIMIT 1`
    ),
    getJiraSettings(),
  ]);
  return ok({
    jiraBaseUrl: jira.baseUrl,
    lastSyncAt: rows[0]?.finished_at || null,
    lastSyncCount: rows[0]?.issues_processed ?? null,
  });
});
