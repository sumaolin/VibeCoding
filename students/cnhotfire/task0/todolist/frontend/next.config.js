/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },
  async rewrites() {
    return [
      // Proxy Next.js /api/* to FastAPI backend
      { source: '/api/:path*', destination: 'http://localhost:8000/api/:path*' },
    ];
  },
};

module.exports = nextConfig;
