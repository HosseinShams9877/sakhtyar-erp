import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

// فقط در محیط توسعه محلی، OpenNext رو فعال کن
if (isDev) {
  const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,  // برای دیپلوی موقتاً ignore کن
  },
  images: {
    unoptimized: process.platform === 'win32',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-icons'],
  },
};

export default nextConfig;