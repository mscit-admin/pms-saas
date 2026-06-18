import { handler, ok, fail } from '@/lib/http';
import { runSync } from '@/lib/sync';
import { syncConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';
// المزامنة قد تطول مع آلاف التذاكر — نرفع المهلة (للنشر على Vercel وغيره)
export const maxDuration = 300;

// تشغيل مزامنة يدوياً أو من مجدول خارجي (cron).
// محمي بتوكن SYNC_SECRET عبر ترويسة x-sync-secret أو ?secret=.
export const POST = handler(async (req) => {
  const url = new URL(req.url);
  const provided = req.headers.get('x-sync-secret') || url.searchParams.get('secret');

  if (syncConfig.secret && provided !== syncConfig.secret) {
    return fail('غير مصرّح: توكن المزامنة غير صحيح', 401);
  }

  const result = await runSync();
  return ok(result);
});
