#!/usr/bin/env node
// تطبيق مخطط قاعدة البيانات (db/schema.sql) — إنشاء الجداول إن لم تكن موجودة.
// التشغيل: npm run db:migrate
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: '.env.local' });
dotenv.config(); // .env كاحتياط

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const schemaPath = join(__dirname, '..', 'db', 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf8');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jira_monitor',
    multipleStatements: true, // ملف المخطط يحوي عدة عبارات
    charset: 'utf8mb4',
  });

  try {
    await conn.query(sql);
    console.log('✓ تم تطبيق المخطط بنجاح على قاعدة:', process.env.DB_NAME);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('✗ فشل تطبيق المخطط:', err.message);
  process.exit(1);
});
