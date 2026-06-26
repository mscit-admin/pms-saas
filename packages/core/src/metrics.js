// مقاييس قاعدة بيانات كل مستأجر (دقيقة) من information_schema داخل قاعدته.
import { query } from './db.js';
import { runInTenant } from './tenancy.js';

const MB = 1024 * 1024;

export async function tenantDbMetrics(org) {
  return runInTenant(org, async () => {
    const rows = await query(
      `SELECT table_name AS name, ENGINE AS engine,
              COALESCE(data_length,0)  AS dataLen,
              COALESCE(index_length,0) AS indexLen,
              COALESCE(table_rows,0)   AS rowCount
         FROM information_schema.tables
        WHERE table_schema = DATABASE()
        ORDER BY (COALESCE(data_length,0) + COALESCE(index_length,0)) DESC`
    );
    let dataBytes = 0; let indexBytes = 0; let rowsTotal = 0;
    for (const r of rows) {
      dataBytes += Number(r.dataLen) || 0;
      indexBytes += Number(r.indexLen) || 0;
      rowsTotal += Number(r.rowCount) || 0;
    }
    const totalBytes = dataBytes + indexBytes;
    const top = rows.slice(0, 6).map((r) => ({
      name: r.name,
      size: (Number(r.dataLen) || 0) + (Number(r.indexLen) || 0),
      rows: Number(r.rowCount) || 0,
    }));
    // مستوى أداء تقريبي من الحجم وعدد الصفوف (إشارة عامة لا قياس CPU)
    const mb = totalBytes / MB;
    const level = mb < 50 && rowsTotal < 100_000 ? 'good'
      : mb < 500 && rowsTotal < 2_000_000 ? 'moderate' : 'heavy';
    return { tables: rows.length, dataBytes, indexBytes, totalBytes, rows: rowsTotal, top, level };
  });
}
