#!/usr/bin/env node
// إقلاع كامل للـ SaaS عند تشغيل الحاوية (idempotent):
//   1) تهيئة قاعدة التحكّم.
//   2) ضمان منظمة افتراضية إن ضُبط BOOTSTRAP_TENANT_SLUG (توفير أو ترقية).
// آمن للتكرار عند كل إقلاع. التشغيل: node scripts/bootstrap.js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const { ensureControlSchema, ensureTenant } = await import('../src/bootstrap.js');

const log = (m) => console.log(m);

try {
  await ensureControlSchema({ log });

  const slug = process.env.BOOTSTRAP_TENANT_SLUG;
  if (slug) {
    await ensureTenant({
      slug,
      name: process.env.BOOTSTRAP_TENANT_NAME || slug,
      adminPassword: process.env.ADMIN_INITIAL_PASSWORD || 'admin',
      log,
    });
  } else {
    log('… لا BOOTSTRAP_TENANT_SLUG — وفّر منظمة يدوياً عبر provision:tenant');
  }
  log('✓ اكتمل الإقلاع');
  process.exit(0);
} catch (err) {
  console.error('✗ فشل الإقلاع:', err.message);
  process.exit(1);
}
