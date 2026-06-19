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

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.className}>
      <body
        style={{
          margin: 0,
          background: '#f4f5f6',
          color: '#1f272e',
        }}
      >
        {children}
      </body>
    </html>
  );
}
