// خدمة الواجهة (Next.js) — تخدم الواجهة فقط، وتعيد كتابة كل طلبات /api
// إلى خدمة الـ API المستقلّة. عنوان الخدمة يأتي من متغيّر البيئة API_URL.
const API_URL = process.env.API_URL || 'http://api:3001';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
    ];
  },
};

export default nextConfig;
