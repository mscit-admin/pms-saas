/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // الحزم التي يجب أن تبقى خارج تجميع الخادم (تشغّل native bindings)
  experimental: {
    serverComponentsExternalPackages: ['mysql2'],
  },
};

export default nextConfig;
