/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ]
  },
  allowedDevOrigins: [
    'http://localhost:3001',
    // ако ползваш remote IP:
    'http://192.168.199.129:3001'
  ],
}
