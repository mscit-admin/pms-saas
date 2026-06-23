import { handler, ok } from '@/lib/http';
import { requirePermission, requireUser } from '@/lib/auth';
import { runSync } from '@/lib/sync';
import { query } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// قفل بسيط داخل عملية الويب يمنع تشغيل مزامنتين متزامنتين.
let running = false;

// تشغيل المزامنة من داخل التطبيق.
//  • يدوي (زر المزامنة): يتطلّب صلاحية trigger_sync ويعمل دائماً.
//  • تلقائي عند الدخول (?auto=1): لأي مستخدم مسجّل، لكن مع كَبح زمني يتخطّى
//    المزامنة إن كانت آخر مزامنة حديثة (auto_sync_min دقيقة، افتراضياً 10).
export const POST = handler(async (req) => {
  const auto = new URL(req.url).searchParams.get('auto') === '1';
  const me = auto ? await requireUser() : await requirePermission('trigger_sync');

  if (running) return ok({ started: false, alreadyRunning: true });

  if (auto) {
    const mins = Math.max(1, parseInt(await getSetting('auto_sync_min', '10'), 10) || 10);
    const rows = await query('SELECT started_at FROM sync_log ORDER BY id DESC LIMIT 1');
    const last = rows[0]?.started_at;
    if (last) {
      const lastMs = new Date(`${String(last).replace(' ', 'T')}Z`).getTime();
      if (Number.isFinite(lastMs) && Date.now() - lastMs < mins * 60000) {
        return ok({ started: false, skipped: true });
      }
    }
  }

  running = true;
  // الخادم دائم التشغيل (systemd) — نُطلق المزامنة دون انتظار ونُرجع فوراً.
  runSync()
    .catch((e) => console.error('sync failed:', e?.message || e))
    .finally(() => { running = false; });
  // لا نُسجّل المزامنة التلقائية في التدقيق كي لا نُغرقه عند كل دخول.
  if (!auto) await logAudit({ action: 'sync_trigger', actorId: me.id, actorName: me.username, targetType: 'sync', ip: clientIp(req) });
  return ok({ started: true });
});
