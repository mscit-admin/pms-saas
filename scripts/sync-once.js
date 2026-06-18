#!/usr/bin/env node
// تشغيل مزامنة واحدة من سطر الأوامر (مفيد للاختبار وأول تعبئة للبيانات).
// التشغيل: npm run jira:sync
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const { runSync } = await import('../src/lib/sync.js');

try {
  console.log('› بدء المزامنة مع جيرا ...');
  const result = await runSync();
  console.log('✓ انتهت المزامنة:', result);
  process.exit(0);
} catch (err) {
  console.error('✗ فشلت المزامنة:', err.message);
  process.exit(1);
}
