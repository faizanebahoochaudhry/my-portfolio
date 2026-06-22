import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Helps Turbopack resolve the app root when the folder path contains spaces.
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
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
