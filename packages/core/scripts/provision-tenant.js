#!/usr/bin/env node
// توفير منظمة (مستأجر) جديدة: قاعدة بيانات مستقلّة + مخطط + سجلّ تحكّم + أدمن.
// التشغيل:
//   node scripts/provision-tenant.js --slug acme --name "Acme Inc" [--admin-pass s3cret]
// أو عبر npm:  npm run provision:tenant -- --slug acme --name "Acme Inc"
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const slug = arg('slug');
const name = arg('name', slug);
const adminUsername = arg('admin-user', 'admin');
const adminPassword = arg('admin-pass', process.env.ADMIN_INITIAL_PASSWORD || 'admin');

if (!slug) {
  console.error('✗ يجب تمرير --slug (النطاق الفرعي للمنظمة).');
  process.exit(1);
}

const { provisionTenant } = await import('../src/provision.js');

try {
  const org = await provisionTenant({
    name, slug, adminUsername, adminPassword, log: (m) => console.log(m),
  });
  console.log(`\n✓ المنظمة جاهزة: ${org.slug} (id=${org.id})`);
  console.log(`  الدخول عبر: https://${org.slug}.${process.env.APP_ROOT_DOMAIN || 'localhost'}`);
  console.log(`  المستخدم: ${adminUsername} — غيّر كلمة المرور فوراً.`);
  process.exit(0);
} catch (err) {
  console.error('✗ فشل التوفير:', err.message);
  process.exit(1);
}
