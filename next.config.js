/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Expo web development reads the authenticated subscription endpoint.
  // Limit CORS to the two loopback origins; bearer authentication still applies.
  async headers() {
    return ['http://localhost:8081', 'http://127.0.0.1:8081'].map(origin => ({
      source: '/api/driver/subscription',
      has: [{ type: 'header', key: 'origin', value: origin.replaceAll('.', '\\\\.') }],
      headers: [
        { key: 'Access-Control-Allow-Origin', value: origin },
        { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Authorization, Cache-Control, Content-Type' },
        { key: 'Vary', value: 'Origin' },
      ],
    }));
  },
};

module.exports = nextConfig;
