#!/usr/bin/env node
// إنشاء قاعدة التحكّم المركزية (Control Plane) وتطبيق مخططها.
// التشغيل: npm run db:migrate:control
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const { ensureControlSchema } = await import('../src/bootstrap.js');

try {
  await ensureControlSchema({ log: (m) => console.log(m) });
  process.exit(0);
} catch (err) {
  console.error('✗ فشلت تهيئة قاعدة التحكّم:', err.message);
  process.exit(1);
}
