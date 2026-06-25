import { Cairo } from 'next/font/google';

// خدمة الواجهة بلا اتصال مباشر بقاعدة البيانات — تجلب بيان الهوية من خدمة الـ API.
const API_URL = process.env.API_URL || 'http://api:3001';

async function brandManifest() {
  const res = await fetch(`${API_URL}/api/branding/manifest`, { cache: 'no-store' });
  const json = await res.json();
  if (!json?.ok) throw new Error('manifest unavailable');
  return json.data;
}

// خط Cairo — عربي/لاتيني، مستضاف ذاتياً عبر next/font (لا طلب خارجي من المتصفح).
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

// إعدادات منفذ العرض — أساسية للاستجابة على الجوال (وإلا يُعرض بعرض سطح المكتب مصغّراً)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0f141b',
};

// التخطيط الجذري — عربي RTL. الأيقونة المخصّصة تُطبَّق إن رُفعت.
export async function generateMetadata() {
  let icons;
  let title = 'مراقب جيرا — لوحة الاستثناءات';
  try {
    const m = await brandManifest();
    if (m.favicon) icons = { icon: `/api/branding/asset/favicon?v=${m.ts}` };
    if (m.appName) title = m.appName;
  } catch { /* قاعدة البيانات غير جاهزة بعد */ }
  return {
    title,
    description: 'تحويل مئات تذاكر جيرا إلى ما يحتاج تدخّل المدير فقط',
    icons,
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, statusBarStyle: 'default', title: 'PMS' },
  };
}

// متغيّرات الثيم (فاتح/داكن) + تطبيق الثيم المحفوظ قبل الرسم لتفادي الوميض
const THEME_CSS = `
:root{--c-bg:#f4f5f6;--c-card:#ffffff;--c-border:#e2e6e9;--c-text:#1f272e;--c-muted:#6b7785;color-scheme:light;}
[data-theme="dark"]{--c-bg:#0f141b;--c-card:#171f29;--c-border:#2a3642;--c-text:#e6edf3;--c-muted:#94a3b3;color-scheme:dark;}
*{box-sizing:border-box;}
html,body{max-width:100%;overflow-x:hidden;}
input,select,textarea{background:var(--c-card);color:var(--c-text);}
/* مؤشّر «آخر مزامنة»: نقطة وامضة + تلميح عند المرور */
@keyframes pmsFlash{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.2;transform:scale(.7);}}
.pms-live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 6px #22c55e;animation:pmsFlash 1.1s ease-in-out infinite;}
.pms-tip{position:relative;}
.pms-tip>.pms-tip-box{position:absolute;top:135%;inset-inline-start:0;background:var(--c-text);color:var(--c-bg);font-size:12px;line-height:1.5;padding:7px 11px;border-radius:6px;max-width:260px;white-space:normal;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .15s;z-index:60;box-shadow:0 8px 22px rgba(0,0,0,.28);}
.pms-tip:hover>.pms-tip-box{opacity:1;visibility:visible;}
@media print{
  .no-print{display:none !important;}
  :root,[data-theme="dark"]{--c-bg:#ffffff;--c-card:#ffffff;--c-border:#cccccc;--c-text:#000000;--c-muted:#444444;}
  body{background:#fff;}
  section{break-inside:avoid;box-shadow:none !important;}
}
`;
const THEME_INIT = `try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.className}>
      <body style={{ margin: 0, background: 'var(--c-bg)', color: 'var(--c-text)' }}>
        <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {children}
      </body>
    </html>
  );
}
