#!/usr/bin/env node
// بذر دور Admin ومستخدم أدمن داخل قاعدة مستأجر محدّد (database-per-tenant).
// يتطلّب --slug لتحديد المنظمة المستهدفة (لم يعد هناك قاعدة وحيدة عالمية).
// التشغيل: npm run seed:admin -- --slug acme
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const slug = arg('slug');
if (!slug) {
  console.error('✗ يجب تمرير --slug (المنظمة المستهدفة). للتوفير الكامل استخدم provision-tenant.js');
  process.exit(1);
}

const password = arg('admin-pass') || process.env.ADMIN_INITIAL_PASSWORD || 'admin';

const { findOrgBySlug, runInTenant } = await import('../src/tenancy.js');
const { seedTenantAdmin } = await import('../src/provision.js');

try {
  const org = await findOrgBySlug(slug);
  if (!org) {
    console.error(`✗ لا توجد منظمة بالنطاق الفرعي: ${slug}`);
    process.exit(1);
  }
  await runInTenant(org, () => seedTenantAdmin({ password }));
  console.log(`✓ جاهز: المستخدم 'admin' بدور Admin داخل المنظمة ${slug}.`);
  console.log(`  كلمة المرور: ${process.env.ADMIN_INITIAL_PASSWORD || arg('admin-pass') ? '(مُمرّرة)' : "'admin' — غيّرها فوراً"}`);
  process.exit(0);
} catch (err) {
  console.error('✗ فشل التهيئة:', err.message);
  process.exit(1);
}
