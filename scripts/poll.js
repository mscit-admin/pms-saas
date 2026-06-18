#!/usr/bin/env node
// مزامنة دورية (Polling) كل بضع دقائق — عملية مستقلة تعمل بجانب الخادم.
// Webhooks لاحقاً تحلّ محلّ هذا. التشغيل: npm run jira:poll
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const { runSync } = await import('../src/lib/sync.js');

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

console.log(`› بدء السحب الدوري كل ${intervalMin} دقيقة. اضغط Ctrl+C للإيقاف.`);
await tick(); // دورة فورية عند الإقلاع
setInterval(tick, intervalMs);
