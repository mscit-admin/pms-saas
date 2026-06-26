// توفير المستأجرين (Provisioning) — إنشاء قاعدة بيانات مستقلّة لكل منظمة،
// تطبيق المخطط الكامل عليها، تسجيل المنظمة في قاعدة التحكّم، وبذر مستخدم أدمن.
// هذا الأساس الذي سيستدعيه التسجيل الذاتي (Phase 3) وسكربت التوفير اليدوي.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import mysql from 'mysql2/promise';
import { dbConfig } from './config.js';
import { controlQuery } from './control-db.js';
import {
  isValidSlug, isSlugAvailable, dbNameForSlug, runInTenant,
} from './tenancy.js';
import { hashPassword } from './auth.js';
import { PERMISSION_KEYS } from './permissions.js';
import { withTransaction } from './db.js';
import { enqueueCertForSlug } from './certs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = join(__dirname, '..', 'db');

// قراءة كل ملفات المخطط بالترتيب الأبجدي (نفس ترتيب migrate التاريخي).
export function schemaFiles() {
  return readdirSync(SCHEMA_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => join(SCHEMA_DIR, f));
}

// تطبيق كل المخطط على اتصال يشير مسبقاً إلى قاعدة المستأجر.
export async function applySchema(conn, { log = () => {} } = {}) {
  for (const file of schemaFiles()) {
    const sql = readFileSync(file, 'utf8');
    await conn.query(sql);
    log(`  ✓ ${file.split('/').pop()}`);
  }
}

// اسم قاعدة آمن للإدراج المباشر (لا يقبل namedPlaceholders في DDL).
function assertSafeDbName(dbName) {
  if (!/^[a-z0-9_]+$/.test(dbName)) {
    throw new Error(`اسم قاعدة غير آمن: ${dbName}`);
  }
}

// إنشاء قاعدة المستأجر وتطبيق المخطط عليها (دون لمس قاعدة التحكّم).
export async function createTenantDatabase(dbName, opts = {}) {
  assertSafeDbName(dbName);
  // اتصال إداري (multipleStatements لتطبيق ملفات المخطط) ببيانات الخادم المشتركة.
  const admin = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    multipleStatements: true,
    charset: 'utf8mb4',
  });
  try {
    await admin.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await admin.query(`USE \`${dbName}\``);
    await applySchema(admin, opts);
  } finally {
    await admin.end();
  }
}

// بذر دور Admin (بكل الصلاحيات) ومستخدم أدمن داخل قاعدة المستأجر الجاري.
// يُستدعى ضمن runInTenant. آمن للتكرار (idempotent).
export async function seedTenantAdmin({ username = 'admin', fullName = 'Administrator', password }) {
  await withTransaction(async (conn) => {
    await conn.execute(
      `INSERT INTO roles (name, description, is_system) VALUES ('Admin', 'مدير المنظمة — كل الصلاحيات', 1)
       ON DUPLICATE KEY UPDATE description = VALUES(description), is_system = 1`
    );
    const [[role]] = await conn.query("SELECT id FROM roles WHERE name = 'Admin'");
    for (const key of PERMISSION_KEYS) {
      await conn.execute(
        'INSERT IGNORE INTO role_permissions (role_id, permission_key) VALUES (:r, :k)',
        { r: role.id, k: key }
      );
    }
    const hash = await hashPassword(password || 'admin');
    await conn.execute(
      `INSERT INTO users (username, full_name, password_hash) VALUES (:u, :f, :h)
       ON DUPLICATE KEY UPDATE username = username`,
      { u: username, f: fullName, h: hash }
    );
    const [[user]] = await conn.query('SELECT id FROM users WHERE username = :u', { u: username });
    await conn.execute(
      'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (:u, :r)',
      { u: user.id, r: role.id }
    );
  });
}

// التوفير الكامل لمنظمة جديدة: تحقّق → قاعدة → مخطط → سجلّ التحكّم → أدمن.
// يرجع صفّ المنظمة الجاهز للاستخدام كسياق مستأجر.
export async function provisionTenant({
  name, slug, adminUsername = 'admin', adminPassword, log = () => {},
}) {
  if (!isValidSlug(slug)) throw new Error(`نطاق فرعي غير صالح: ${slug}`);
  if (!(await isSlugAvailable(slug))) throw new Error(`النطاق الفرعي غير متاح: ${slug}`);

  const dbName = dbNameForSlug(slug);
  assertSafeDbName(dbName);

  log(`» إنشاء قاعدة المستأجر ${dbName}…`);
  await createTenantDatabase(dbName, { log });

  log('» تسجيل المنظمة في قاعدة التحكّم…');
  await controlQuery(
    `INSERT INTO organizations (name, slug, db_name, status, plan)
     VALUES (:name, :slug, :db, 'active', 'trial')`,
    { name: name || slug, slug, db: dbName }
  );
  const [org] = await controlQuery(
    `SELECT id, name, slug, db_name AS dbName, status, plan FROM organizations WHERE slug = :slug`,
    { slug }
  );

  log('» بذر مستخدم الأدمن…');
  await runInTenant(org, () => seedTenantAdmin({ username: adminUsername, password: adminPassword }));

  // اطلب شهادة TLS لنطاق العميل الفرعي (يُصدرها سكربت المضيف).
  const host = await enqueueCertForSlug(slug);
  if (host) log(`» طُلبت شهادة TLS لـ ${host}`);

  log(`✓ جاهز: ${slug} → ${dbName}`);
  return org;
}
