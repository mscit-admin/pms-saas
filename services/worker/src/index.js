// خدمة العامل — مزامنة دورية (Polling) مع جيرا كل بضع دقائق.
// عملية مستقلّة قابلة للتوسعة/إعادة التشغيل بمعزل عن خدمتَي الـ API والواجهة.
import 'dotenv/config';
import { runSync } from '@pms/core/sync';

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
    const result = await runSync();
    console.log(`[${startedAt}] ✓ مزامنة:`, result);
  } catch (err) {
    console.error(`[${startedAt}] ✗ خطأ مزامنة:`, err.message);
  } finally {
    running = false;
  }
}

console.log(`[worker] بدء المزامنة الدورية كل ${intervalMin} دقيقة`);
await tick();
setInterval(tick, intervalMs);

// إنهاء نظيف
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`[worker] استلام ${sig} — إيقاف`);
    process.exit(0);
  });
}
