// مساعدات موحّدة لردود JSON من مسارات الـ API.
// تُعيد كائن Response قياسي (Web Fetch API) — صالح في أي بيئة Node 18+
// دون اعتماد على Next.js، كي تعمل في خدمة الـ API المستقلّة (Express).

export function ok(data, init = {}) {
  return Response.json({ ok: true, data }, init);
}

export function fail(message, status = 500) {
  return Response.json({ ok: false, error: String(message) }, { status });
}

// غلاف يلتقط الأخطاء ويعيد رسالة عربية مفهومة بدل 500 صامت
export function handler(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      // أخطاء المصادقة/الصلاحيات تحمل status (401/403)
      const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
      if (status >= 500) console.error('[API]', err);
      return fail(err?.message || 'خطأ غير متوقع في الخادم', status);
    }
  };
}
