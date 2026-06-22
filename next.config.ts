import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Helps Turbopack resolve the app root when the folder path contains spaces.
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [384, 640, 750, 828, 1080, 1200, 1600],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'framerusercontent.com',
        pathname: '/images/**',
      },
    ],
  },
};

export default nextConfig;
