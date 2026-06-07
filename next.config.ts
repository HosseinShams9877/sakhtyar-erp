import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // خروجی استاندارد (غیر استاتیک) برای استفاده از API Routes
  output: 'standalone',
  
  reactStrictMode: true,
  
  typescript: {
    ignoreBuildErrors: true,
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
  
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'https://sakhteman-yar.pages.dev',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'dbyo64vvIe9Qo2JKWsoAgM8HZ03TooJSF4zlz6nBuLM=',
  },
};

export default nextConfig;