import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { runSync } from '@/lib/sync';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// قفل بسيط داخل عملية الويب يمنع تشغيل مزامنتين يدويتين متزامنتين.
let running = false;

// تشغيل المزامنة من داخل التطبيق (صلاحية trigger_sync). تعمل في الخلفية فلا تنتظر الاستجابة.
export const POST = handler(async (req) => {
  const me = await requirePermission('trigger_sync');
  if (running) return ok({ started: false, alreadyRunning: true });
  running = true;
  // الخادم دائم التشغيل (systemd) — نُطلق المزامنة دون انتظار ونُرجع فوراً.
  runSync()
    .catch((e) => console.error('manual sync failed:', e?.message || e))
    .finally(() => { running = false; });
  await logAudit({ action: 'sync_trigger', actorId: me.id, actorName: me.username, targetType: 'sync', ip: clientIp(req) });
  return ok({ started: true });
});
