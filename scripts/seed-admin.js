#!/usr/bin/env node
// إنشاء دور Admin (بكل الصلاحيات) ومستخدم admin أولي. آمن للتكرار (idempotent).
// كلمة المرور من ADMIN_INITIAL_PASSWORD أو 'admin' افتراضياً. التشغيل: npm run seed:admin
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const { query, withTransaction } = await import('../src/lib/db.js');
const { hashPassword } = await import('../src/lib/auth.js');
const { PERMISSION_KEYS } = await import('../src/lib/permissions.js');

const password = process.env.ADMIN_INITIAL_PASSWORD || 'admin';

try {
  await withTransaction(async (conn) => {
    // دور Admin
    await conn.execute(
      `INSERT INTO roles (name, description, is_system) VALUES ('Admin', 'مدير النظام — كل الصلاحيات', 1)
       ON DUPLICATE KEY UPDATE description = VALUES(description), is_system = 1`
    );
    const [[role]] = await conn.query("SELECT id FROM roles WHERE name = 'Admin'");
    for (const key of PERMISSION_KEYS) {
      await conn.execute(
        'INSERT IGNORE INTO role_permissions (role_id, permission_key) VALUES (:r, :k)',
        { r: role.id, k: key }
      );
    }

    // مستخدم admin
    const hash = await hashPassword(password);
    await conn.execute(
      `INSERT INTO users (username, full_name, password_hash) VALUES ('admin', 'Administrator', :h)
       ON DUPLICATE KEY UPDATE username = username`,
      { h: hash }
    );
    const [[user]] = await conn.query("SELECT id FROM users WHERE username = 'admin'");
    await conn.execute(
      'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (:u, :r)',
      { u: user.id, r: role.id }
    );
  });

  console.log("✓ جاهز: المستخدم 'admin' بدور Admin.");
  console.log(`  كلمة المرور: ${process.env.ADMIN_INITIAL_PASSWORD ? '(من ADMIN_INITIAL_PASSWORD)' : "'admin' — غيّرها فوراً"}`);
  process.exit(0);
} catch (err) {
  console.error('✗ فشل التهيئة:', err.message);
  process.exit(1);
}
