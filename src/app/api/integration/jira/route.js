import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getJiraSettings, saveJiraSettings } from '@/lib/jira-settings';

export const dynamic = 'force-dynamic';

// قراءة إعدادات الربط (التوكن لا يُعاد — نُرجع وجوده فقط).
export const GET = handler(async () => {
  await requirePermission('manage_integration');
  const s = await getJiraSettings();
  return ok({
    baseUrl: s.baseUrl,
    email: s.email,
    jql: s.jql,
    searchPath: s.searchPath,
    pageSize: s.pageSize,
    hasToken: Boolean(s.apiToken),
  });
});

// حفظ الإعدادات (التوكن يُحدَّث فقط إن أُرسلت قيمة).
export const PUT = handler(async (req) => {
  await requirePermission('manage_integration');
  const body = await req.json().catch(() => ({}));
  await saveJiraSettings({
    baseUrl: body.baseUrl,
    email: body.email,
    apiToken: body.apiToken,
    jql: body.jql,
    searchPath: body.searchPath,
    pageSize: body.pageSize,
  });
  return ok({ saved: true });
});
