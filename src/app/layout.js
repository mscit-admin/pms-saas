import { Cairo } from 'next/font/google';

// خط Cairo — عربي/لاتيني، مستضاف ذاتياً عبر next/font (لا طلب خارجي من المتصفح).
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

// التخطيط الجذري — عربي RTL، نمط البيت (Frappe/ERPNext).
export const metadata = {
  title: 'مراقب جيرا — لوحة الاستثناءات',
  description: 'تحويل مئات تذاكر جيرا إلى ما يحتاج تدخّل المدير فقط',
};

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
