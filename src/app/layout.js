// التخطيط الجذري — عربي RTL، نمط البيت (Frappe/ERPNext).
export const metadata = {
  title: 'مراقب جيرا — لوحة الاستثناءات',
  description: 'تحويل مئات تذاكر جيرا إلى ما يحتاج تدخّل المدير فقط',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          fontFamily:
            "'Segoe UI', 'Tahoma', 'Noto Sans Arabic', system-ui, sans-serif",
          background: '#f4f5f6',
          color: '#1f272e',
        }}
      >
        {children}
      </body>
    </html>
  );
}
