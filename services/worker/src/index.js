// خدمة العامل — مزامنة دورية (Polling) مع جيرا كل بضع دقائق.
// عملية مستقلّة قابلة للتوسعة/إعادة التشغيل بمعزل عن خدمتَي الـ API والواجهة.
//
// تعدّد المستأجرين: تدور كل دورة عبر المنظمات النشطة، وتُشغّل المزامنة داخل
// سياق كل مستأجر (runInTenant) كي تصيب قاعدة بياناته فقط. (تحسين Phase 5:
// جدولة/حدود معدّل لكل مستأجر بدل التسلسل البسيط.)
import 'dotenv/config';
import { runSync } from '@pms/core/sync';
import { listActiveOrgs, runInTenant } from '@pms/core/tenancy';
import { getBackupConfig, setBackupLastRun, intervalMs as backupInterval } from '@pms/core/backup-config';
import { backupAllTenants } from '@pms/core/backup';

const intervalMin = parseInt(process.env.SYNC_INTERVAL_MINUTES || '5', 10);
const intervalMs = intervalMin * 60 * 1000;

let running = false;

async function tick() {
  if (running) {
    console.log('… المزامنة السابقة لم تنتهِ بعد — تخطّي هذه الدورة');
    return;
  }
  running = true;
  const startedAt = new Date().toISOString();
  try {
    const orgs = await listActiveOrgs();
    let ok = 0;
    for (const org of orgs) {
      try {
        const result = await runInTenant(org, () => runSync());
        ok += 1;
        console.log(`[${startedAt}] ✓ مزامنة ${org.slug}:`, result);
      } catch (err) {
        console.error(`[${startedAt}] ✗ خطأ مزامنة ${org.slug}:`, err.message);
      }
    }
    console.log(`[${startedAt}] انتهت الدورة: ${ok}/${orgs.length} منظمة`);
  } catch (err) {
    console.error(`[${startedAt}] ✗ تعذّر جلب المنظمات:`, err.message);
  } finally {
    running = false;
  }
}

console.log(`[worker] بدء المزامنة الدورية كل ${intervalMin} دقيقة`);
await tick();
setInterval(tick, intervalMs);

// ---- النسخ الاحتياطي التلقائي (يُفحص الاستحقاق كل ساعة) ----
let backupRunning = false;
async function backupTick() {
  if (backupRunning) return;
  let cfg;
  try { cfg = await getBackupConfig(); } catch { return; }
  if (!cfg.enabled) return;
  const last = cfg.lastRunAt ? Date.parse(cfg.lastRunAt) : 0;
  if (Number.isFinite(last) && (Date.now() - last) < backupInterval(cfg.cyclesPerMonth)) return;
  backupRunning = true;
  const at = new Date().toISOString();
  try {
    await setBackupLastRun(at);                 // احجز الدورة لتفادي التكرار
    const res = await backupAllTenants({ dir: cfg.dir, retention: cfg.retention, log: (m) => console.log('[backup]', m) });
    const okN = res.filter((r) => r.ok).length;
    console.log(`[${at}] نسخ احتياطي تلقائي: ${okN}/${res.length} عميل → ${cfg.dir}`);
  } catch (err) {
    console.error(`[${at}] ✗ نسخ احتياطي:`, err.message);
  } finally {
    backupRunning = false;
  }
}
console.log('[worker] مجدول النسخ الاحتياطي فعّال (فحص كل ساعة)');
await backupTick();
setInterval(backupTick, 60 * 60 * 1000);

// إنهاء نظيف
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`[worker] استلام ${sig} — إيقاف`);
    process.exit(0);
  });
}
