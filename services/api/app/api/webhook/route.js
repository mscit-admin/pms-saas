import { handler, ok, fail } from '@/lib/http';
import { syncSingleIssue } from '@/lib/sync';
import { query } from '@/lib/db';
import { webhookSecret } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// مستقبِل أحداث جيرا (Webhooks): عند إنشاء/تحديث/حذف تذكرة.
// محمي بسرّ عبر ?secret= أو ترويسة x-webhook-secret.
// نجلب التذكرة الطازجة من جيرا ونحفظها (نفس منطق المزامنة) لتفادي اختلاف صيغ الحمولة.
export const POST = handler(async (req) => {
  const url = new URL(req.url);
  const provided = req.headers.get('x-webhook-secret') || url.searchParams.get('secret');
  if (webhookSecret && provided !== webhookSecret) {
    return fail('غير مصرّح: سرّ Webhook غير صحيح', 401);
  }

  const body = await req.json().catch(() => ({}));
  const key = body?.issue?.key;
  const event = body?.webhookEvent || '';

  if (!key) return ok({ ignored: true, reason: 'no issue key' });

  // حذف التذكرة من قاعدتنا عند حذفها في جيرا
  if (event.includes('deleted')) {
    await query('DELETE FROM tickets WHERE issue_key = :k', { k: key });
    return ok({ deleted: key });
  }

  const result = await syncSingleIssue(key);
  return ok({ event, ...result });
});
