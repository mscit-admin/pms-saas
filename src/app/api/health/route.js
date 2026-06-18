import { handler, ok, fail } from '@/lib/http';
import { ping } from '@/lib/jira';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// فحص صحة سريع: اتصال قاعدة البيانات + اتصال جيرا.
export const GET = handler(async () => {
  const result = { db: false, jira: false };
  try {
    await query('SELECT 1');
    result.db = true;
  } catch (e) {
    result.dbError = e.message;
  }
  try {
    const me = await ping();
    result.jira = true;
    result.jiraUser = me.displayName || me.emailAddress || null;
  } catch (e) {
    result.jiraError = e.message;
  }
  return result.db && result.jira ? ok(result) : fail(result, 503);
});
