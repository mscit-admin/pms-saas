import mysql from 'mysql2/promise';
import { dbConfig } from './config.js';
import { requireCurrentOrg } from './tenancy.js';

// نموذج تعدّد المستأجرين: قاعدة بيانات لكل مستأجر.
// لا يوجد تجمّع اتصالات وحيد عالمي بعد الآن — بل تجمّع لكل قاعدة مستأجر،
// يُحلّ من سياق المستأجر الجاري (tenancy.js). أي استعلام بلا سياق يفشل مغلقاً.
const pools = new Map(); // dbName → Pool

function poolFor(org) {
  const dbName = org.dbName;
  let pool = pools.get(dbName);
  if (!pool) {
    pool = mysql.createPool({
      // بيانات اتصال خاصة بالمنظمة (تشظية) أو المشتركة من البيئة.
      host: org.dbHost || dbConfig.host,
      port: org.dbPort || dbConfig.port,
      user: org.dbUser || dbConfig.user,
      // كلمة مرور المستأجر تُفكّ تشفيرها في طبقة التوفير (Phase 4)؛ افتراضياً المشتركة.
      password: org.dbPassword || dbConfig.password,
      database: dbName,
      connectionLimit: dbConfig.connectionLimit,
      waitForConnections: true,
      timezone: 'Z',           // نخزّن ونقرأ بتوقيت UTC
      dateStrings: false,
      namedPlaceholders: true,
      charset: 'utf8mb4',
    });
    pools.set(dbName, pool);
  }
  return pool;
}

// تجمّع اتصالات المستأجر الجاري (من السياق). يرمي إن لم يوجد سياق.
export function getPool() {
  return poolFor(requireCurrentOrg());
}

// إغلاق وإزالة تجمّع مستأجر (عند التعليق/الحذف أو إخلاء الذاكرة).
export async function closeTenantPool(dbName) {
  const pool = pools.get(dbName);
  if (pool) {
    pools.delete(dbName);
    await pool.end();
  }
}

// استعلام مختصر يرجع الصفوف فقط — على قاعدة المستأجر الجاري.
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
