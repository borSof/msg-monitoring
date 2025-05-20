// ~/msg-monitoring-ui/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ]
  },
  // if you access from another machine in dev:
  allowedDevOrigins: ['http://192.168.199.129:3001'],
}

module.exports = nextConfig
