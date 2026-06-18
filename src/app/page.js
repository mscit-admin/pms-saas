// نقطة تركيب الواجهة الجاهزة JiraExceptionMonitor.jsx.
//
// عند إضافة ملف الواجهة:
//   1) ضعه في src/components/JiraExceptionMonitor.jsx
//   2) أزِل صفحة الترحيب أدناه واستبدلها بـ:
//        'use client';
//        import JiraExceptionMonitor from '@/components/JiraExceptionMonitor';
//        export default function Page() { return <JiraExceptionMonitor />; }
//   3) اجعل الواجهة تجلب البيانات من مسارات /api (لا اتصال بجيرا من المتصفح).

export default function Page() {
  const endpoints = [
    ['GET  /api/health', 'فحص اتصال قاعدة البيانات وجيرا'],
    ['POST /api/sync', 'تشغيل مزامنة (محمي بـ SYNC_SECRET)'],
    ['GET  /api/exceptions?from=&to=', 'الاستثناءات التشغيلية + العدّادات'],
    ['GET  /api/workload', 'أعباء الفريق'],
    ['GET  /api/analytics/trend?days=30', 'اتجاه الاستثناءات'],
    ['GET  /api/analytics/sla-forecast', 'تنبؤ SLA'],
    ['GET  /api/analytics/cycle-time?days=90', 'زمن الدورة + البقاء في المراحل'],
    ['GET  /api/analytics/summary', 'الملخص التنفيذي'],
    ['GET/PUT /api/sla-config', 'قراءة/ضبط SLA حسب الأولوية'],
  ];

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>مراقب جيرا — الخلفية جاهزة ✅</h1>
      <p style={{ color: '#5b6b76', marginTop: 0 }}>
        ركّب الواجهة <code>JiraExceptionMonitor.jsx</code> هنا. المسارات التالية تغذّيها:
      </p>
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e6e9',
          borderRadius: 8,
          padding: 16,
          marginTop: 16,
        }}
      >
        {endpoints.map(([path, desc]) => (
          <div
            key={path}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              padding: '8px 0',
              borderBottom: '1px solid #f0f2f3',
            }}
          >
            <code style={{ color: '#1f7a4d', direction: 'ltr', textAlign: 'left' }}>{path}</code>
            <span style={{ color: '#5b6b76', fontSize: 14 }}>{desc}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
