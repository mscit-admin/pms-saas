import { handler, ok, fail } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { ping } from '@/lib/jira';
import { getJiraSettings } from '@/lib/jira-settings';

export const dynamic = 'force-dynamic';

// اختبار اتصال جيرا بالإعدادات المُرسَلة (أو المحفوظة). التوكن الفارغ → استخدم المحفوظ.
export const POST = handler(async (req) => {
  await requirePermission('manage_integration');
  const body = await req.json().catch(() => ({}));
  const saved = await getJiraSettings();
  const settings = {
    baseUrl: (body.baseUrl || saved.baseUrl || '').replace(/\/+$/, ''),
    email: body.email || saved.email,
    apiToken: body.apiToken && body.apiToken.trim() ? body.apiToken : saved.apiToken,
  };
  try {
    const me = await ping(settings);
    return ok({ connected: true, user: me.displayName || me.emailAddress || null });
  } catch (e) {
    return fail(e.message, 400);
  }
});
