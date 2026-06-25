#!/usr/bin/env node
// إنشاء قاعدة التحكّم المركزية (Control Plane) وتطبيق مخططها.
// التشغيل: npm run db:migrate:control
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const dbName = process.env.CONTROL_DB_NAME || 'pms_control';
  const host = process.env.CONTROL_DB_HOST || process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.CONTROL_DB_PORT || process.env.DB_PORT || '3306', 10);
  const user = process.env.CONTROL_DB_USER || process.env.DB_USER || 'root';
  const password = process.env.CONTROL_DB_PASSWORD ?? process.env.DB_PASSWORD ?? '';

  const conn = await mysql.createConnection({
    host, port, user, password, multipleStatements: true, charset: 'utf8mb4',
  });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`USE \`${dbName}\``);
    const dir = join(__dirname, '..', 'control-db');
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      await conn.query(readFileSync(join(dir, file), 'utf8'));
      console.log('✓ طُبّق:', file);
    }
    console.log('✓ اكتملت تهيئة قاعدة التحكّم:', dbName);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('✗ فشلت تهيئة قاعدة التحكّم:', err.message);
  process.exit(1);
});
