#!/usr/bin/env node
// تطبيق مخطط قاعدة البيانات على قواعد المستأجرين (database-per-tenant).
//   - بلا وسائط:        يطبّق المخطط على كل المنظمات في قاعدة التحكّم.
//   - --slug <slug>:    يطبّق على منظمة واحدة فقط.
//   - --db <dbName>:    يطبّق على قاعدة بعينها (للتطوير/الطوارئ).
// التشغيل: npm run db:migrate            (كل المستأجرين)
//          npm run db:migrate -- --slug acme
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function schemaSql() {
  const dbDir = join(__dirname, '..', 'db');
  return readdirSync(dbDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({ name: f, sql: readFileSync(join(dbDir, f), 'utf8') }));
}

async function migrateDb(conn, dbName, files) {
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.query(`USE \`${dbName}\``);
  for (const { name, sql } of files) {
    await conn.query(sql);
    console.log(`  ✓ ${name}`);
  }
  console.log(`✓ اكتمل المخطط على: ${dbName}`);
}

async function tenantDbNames() {
  const slug = arg('slug');
  const db = arg('db');
  if (db) return [db];
  // اقرأ المنظمات من قاعدة التحكّم
  const ctrl = await mysql.createConnection({
    host: process.env.CONTROL_DB_HOST || process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.CONTROL_DB_PORT || process.env.DB_PORT || '3306', 10),
    user: process.env.CONTROL_DB_USER || process.env.DB_USER || 'root',
    password: process.env.CONTROL_DB_PASSWORD ?? process.env.DB_PASSWORD ?? '',
    database: process.env.CONTROL_DB_NAME || 'pms_control',
    charset: 'utf8mb4',
  });
  try {
    const sql = slug
      ? 'SELECT db_name FROM organizations WHERE slug = ?'
      : 'SELECT db_name FROM organizations';
    const [rows] = await ctrl.query(sql, slug ? [slug] : []);
    return rows.map((r) => r.db_name);
  } finally {
    await ctrl.end();
  }
}

async function main() {
  const files = schemaSql();
  const names = await tenantDbNames();
  if (!names.length) {
    console.log('… لا توجد قواعد مستأجرين لتطبيق المخطط (هل وفّرت منظمة؟).');
    return;
  }
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    charset: 'utf8mb4',
  });
  try {
    for (const dbName of names) await migrateDb(conn, dbName, files);
    console.log(`\n✓ طُبّق المخطط على ${names.length} قاعدة مستأجر.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('✗ فشل تطبيق المخطط:', err.message);
  process.exit(1);
});
