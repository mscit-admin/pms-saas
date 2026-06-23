#!/usr/bin/env node
// إعادة بناء لقطات الاتجاه للأيام الماضية من التاريخ. التشغيل: npm run jira:backfill
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const { backfillTrend } = await import('../src/backfill.js');

const days = parseInt(process.argv[2] || '30', 10);

try {
  console.log(`› إعادة بناء الاتجاه لآخر ${days} يوماً ...`);
  const result = await backfillTrend({ days });
  console.log('✓ تم:', result);
  process.exit(0);
} catch (err) {
  console.error('✗ فشل إعادة البناء:', err.message);
  process.exit(1);
}
