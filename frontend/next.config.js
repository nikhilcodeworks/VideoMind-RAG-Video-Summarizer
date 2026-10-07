/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
  // Increase proxy timeout to 5 minutes as safety net for long requests
  httpAgentOptions: {
    keepAlive: true,
  },
  experimental: {
    proxyTimeout: 300000,  // 5 minutes in ms
  },
};

module.exports = nextConfig;
