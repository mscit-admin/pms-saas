// إقلاع الـ SaaS (idempotent) — يُستدعى من السكربتات وحاويات الإقلاع:
//   1) ensureControlSchema: إنشاء قاعدة التحكّم وتطبيق مخططها.
//   2) ensureTenant: توفير منظمة افتراضية إن لم توجد، أو ترقية مخططها إن وُجدت.
// كلاهما آمن للتكرار، فيصحّ تشغيلهما عند كل إقلاع للحاوية.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import mysql from 'mysql2/promise';
import { dbConfig, controlDbConfig } from './config.js';
import { findOrgBySlug, runInTenant } from './tenancy.js';
import { provisionTenant, applySchema } from './provision.js';
import { seedControlAdmin } from './control-auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// إنشاء قاعدة التحكّم وتطبيق كل ملفات control-db/*.sql عليها.
export async function ensureControlSchema({ log = () => {} } = {}) {
  const dbName = controlDbConfig.database;
  const admin = await mysql.createConnection({
    host: controlDbConfig.host,
    port: controlDbConfig.port,
    user: controlDbConfig.user,
    password: controlDbConfig.password,
    multipleStatements: true,
    charset: 'utf8mb4',
  });
  try {
    await admin.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await admin.query(`USE \`${dbName}\``);
    const dir = join(__dirname, '..', 'control-db');
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
      await admin.query(readFileSync(join(dir, f), 'utf8'));
      log(`  ✓ control/${f}`);
    }
    log(`✓ قاعدة التحكّم جاهزة: ${dbName}`);
  } finally {
    await admin.end();
  }

  // بذر المشرف الأعلى من متغيّرات البيئة (إن ضُبطت).
  const su = process.env.CONTROL_ADMIN_USER;
  const sp = process.env.CONTROL_ADMIN_PASSWORD;
  if (su && sp) {
    await seedControlAdmin({ username: su, password: sp });
    log(`✓ مشرف أعلى جاهز: ${su}`);
  }
}

// ضمان وجود منظمة بالـ slug: توفير كامل إن غابت، أو ترقية مخططها إن وُجدت.
export async function ensureTenant({ slug, name, adminPassword, log = () => {} }) {
  const existing = await findOrgBySlug(slug);
  if (!existing) {
    log(`» توفير منظمة جديدة: ${slug}`);
    return provisionTenant({ name: name || slug, slug, adminPassword, log });
  }
  // موجودة: رقِّ مخططها (لأعمدة/جداول جديدة) عبر اتصال إداري على قاعدتها.
  log(`» المنظمة ${slug} موجودة — ترقية المخطط…`);
  const admin = await mysql.createConnection({
    host: existing.dbHost || dbConfig.host,
    port: existing.dbPort || dbConfig.port,
    user: existing.dbUser || dbConfig.user,
    password: dbConfig.password,
    database: existing.dbName,
    multipleStatements: true,
    charset: 'utf8mb4',
  });
  try {
    await applySchema(admin, { log });
    log(`✓ رُقّي مخطط ${slug}`);
  } finally {
    await admin.end();
  }
  return existing;
}
