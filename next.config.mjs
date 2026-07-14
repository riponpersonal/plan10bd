/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['localhost:3000', '127.0.0.1:3000', '192.168.56.1:3000', '192.168.56.1'],
  devIndicators: false,
  output: 'standalone',
};

export default nextConfig;
