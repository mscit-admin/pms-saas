import { Cairo } from 'next/font/google';
import { brandManifest } from '@/lib/branding';

// خط Cairo — عربي/لاتيني، مستضاف ذاتياً عبر next/font (لا طلب خارجي من المتصفح).
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

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
  };
}

// متغيّرات الثيم (فاتح/داكن) + تطبيق الثيم المحفوظ قبل الرسم لتفادي الوميض
const THEME_CSS = `
:root{--c-bg:#f4f5f6;--c-card:#ffffff;--c-border:#e2e6e9;--c-text:#1f272e;--c-muted:#6b7785;color-scheme:light;}
[data-theme="dark"]{--c-bg:#0f141b;--c-card:#171f29;--c-border:#2a3642;--c-text:#e6edf3;--c-muted:#94a3b3;color-scheme:dark;}
input,select,textarea{background:var(--c-card);color:var(--c-text);}
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
