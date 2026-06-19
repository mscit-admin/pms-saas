#!/usr/bin/env node
// تطبيق مخطط قاعدة البيانات (db/schema.sql) — إنشاء الجداول إن لم تكن موجودة.
// التشغيل: npm run db:migrate
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: '.env.local' });
dotenv.config(); // .env كاحتياط

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const dbDir = join(__dirname, '..', 'db');
  // طبّق كل ملفات .sql بالترتيب الأبجدي (schema.sql ثم schema-auth.sql ...)
  const files = readdirSync(dbDir).filter((f) => f.endsWith('.sql')).sort();

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jira_monitor',
    multipleStatements: true, // ملفات المخطط تحوي عدة عبارات
    charset: 'utf8mb4',
  });

  try {
    for (const file of files) {
      const sql = readFileSync(join(dbDir, file), 'utf8');
      await conn.query(sql);
      console.log('✓ طُبّق:', file);
    }
    console.log('✓ اكتمل تطبيق المخطط على قاعدة:', process.env.DB_NAME);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('✗ فشل تطبيق المخطط:', err.message);
  process.exit(1);
});
