import mysql from 'mysql2/promise';
import { dbConfig } from './config.js';

// تجمّع اتصالات واحد يُعاد استخدامه عبر الطلبات (مهم في بيئة Next.js / hot reload).
let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      connectionLimit: dbConfig.connectionLimit,
      waitForConnections: true,
      timezone: 'Z',           // نخزّن ونقرأ بتوقيت UTC
      dateStrings: false,
      namedPlaceholders: true,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

// استعلام مختصر يرجع الصفوف فقط
export async function query(sql, params = {}) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

// تنفيذ ضمن معاملة واحدة (للمزامنة: upsert التذكرة + إدراج تاريخها معاً)
export async function withTransaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
