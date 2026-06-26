// طبقة الوصول إلى قاعدة التحكّم المركزية (Control Plane).
// منفصلة تماماً عن db.js (قواعد المستأجرين) كي لا يحدث التباس:
//   - control-db.js  → سجلّ المنظمات وتوجيه النطاقات (قاعدة pms_control)
//   - db.js          → بيانات مستأجر واحد حسب السياق الجاري
import mysql from 'mysql2/promise';
import { controlDbConfig } from './config.js';

let controlPool;

export function getControlPool() {
  if (!controlPool) {
    controlPool = mysql.createPool({
      host: controlDbConfig.host,
      port: controlDbConfig.port,
      user: controlDbConfig.user,
      password: controlDbConfig.password,
      database: controlDbConfig.database,
      connectionLimit: controlDbConfig.connectionLimit,
      waitForConnections: true,
      timezone: 'Z',
      dateStrings: false,
      namedPlaceholders: true,
      charset: 'utf8mb4',
    });
  }
  return controlPool;
}

export async function controlQuery(sql, params = {}) {
  const [rows] = await getControlPool().execute(sql, params);
  return rows;
}

export async function controlWithTransaction(fn) {
  const conn = await getControlPool().getConnection();
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
