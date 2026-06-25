// خدمة الـ API — خادم Express مستقلّ يخدم كل مسارات /api.
// يُشغَّل عبر: node --import ./src/register-loader.mjs ./src/server.js
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { registerRoutes } from './fs-router.js';
import { tenantGate } from './tenant-mw.js';
import { authGate } from './auth-mw.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_DIR = join(__dirname, '..', 'app', 'api');
const PORT = parseInt(process.env.API_PORT || process.env.PORT || '3001', 10);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

// نلتقط الجسم الخام كـ Buffer لكل الأنواع؛ المعالجات تفكّه عبر req.json()/req.formData()
app.use(express.raw({ type: () => true, limit: '12mb' }));

// تحديد المستأجر من النطاق الفرعي (قبل المصادقة: الجلسة تخصّ مستأجراً بعينه)
app.use(tenantGate());

// حارس الجلسة قبل المعالجات
app.use(authGate());

const registered = await registerRoutes(app, API_DIR);
console.log(`[api] سُجّل ${registered.length} مسار`);

// لا مسار مطابق
app.use((req, res) => res.status(404).json({ ok: false, error: 'المسار غير موجود' }));

// معالج أخطاء موحّد (يجب أن يكون الأخير، بأربع وسائط)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500) console.error('[api]', err);
  res.status(status).json({ ok: false, error: err?.message || 'خطأ غير متوقع في الخادم' });
});

app.listen(PORT, () => console.log(`[api] يعمل على المنفذ ${PORT}`));
